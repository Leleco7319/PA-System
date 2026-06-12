import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { isNodeOnline } from '@/lib/utils'
import { apiError, handleRoute, requireSession } from '@/lib/api-utils'

export const GET = handleRoute(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  await connectDB()
  const no = await NoModel.findById(id).populate('grupos', 'nome').lean()
  if (!no) return apiError('Nó não encontrado', 404)

  return NextResponse.json({ ...no, online: isNodeOnline(no.ultimoHeartbeat) })
})

export const DELETE = handleRoute(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  await connectDB()
  const no = await NoModel.findByIdAndDelete(id)
  if (!no) return apiError('Nó não encontrado', 404)

  return NextResponse.json({ success: true })
})
