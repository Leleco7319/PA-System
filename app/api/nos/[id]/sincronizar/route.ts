import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { apiError, handleRoute, requireSession } from '@/lib/api-utils'

export const POST = handleRoute(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  await connectDB()
  const no = await NoModel.findById(id).lean()
  if (!no) return apiError('Nó não encontrado', 404)

  try {
    const resp = await fetch(`http://${no.ip}/sync`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    })
    return NextResponse.json({ success: resp.ok, status: resp.status })
  } catch {
    return NextResponse.json({ success: false, error: 'Nó inacessível' }, { status: 502 })
  }
})
