import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const no = await NoModel.findById(id).lean()
  if (!no) return NextResponse.json({ error: 'Nó não encontrado' }, { status: 404 })

  try {
    const resp = await fetch(`http://${no.ip}/sync`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    })
    return NextResponse.json({ success: resp.ok, status: resp.status })
  } catch {
    return NextResponse.json({ success: false, error: 'Nó inacessível' }, { status: 502 })
  }
}
