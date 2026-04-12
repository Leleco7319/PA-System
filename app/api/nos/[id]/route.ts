import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { isNodeOnline } from '@/lib/utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const no = await NoModel.findById(id).populate('grupos', 'nome').lean()
  if (!no) return NextResponse.json({ error: 'Nó não encontrado' }, { status: 404 })

  return NextResponse.json({ ...no, online: isNodeOnline(no.ultimoHeartbeat) })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const no = await NoModel.findByIdAndDelete(id)
  if (!no) return NextResponse.json({ error: 'Nó não encontrado' }, { status: 404 })

  return NextResponse.json({ success: true })
}
