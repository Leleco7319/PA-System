import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import GrupoModel from '@/models/Grupo'
import { apiError, handleRoute, parseBody, requireSession } from '@/lib/api-utils'
import { grupoUpdateSchema } from '@/lib/validators'

export const PUT = handleRoute(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  const parsed = await parseBody(request, grupoUpdateSchema)
  if (parsed.error) return parsed.error
  const { nome, descricao, nosIds } = parsed.data

  const update: { nome?: string; descricao?: string; nos?: string[] } = {}
  if (nome !== undefined) update.nome = nome
  if (descricao !== undefined) update.descricao = descricao
  if (nosIds !== undefined) update.nos = nosIds

  await connectDB()
  const grupo = await GrupoModel.findByIdAndUpdate(id, update, { new: true })
  if (!grupo) return apiError('Grupo não encontrado', 404)

  return NextResponse.json(grupo)
})

export const DELETE = handleRoute(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  await connectDB()
  const grupo = await GrupoModel.findByIdAndDelete(id)
  if (!grupo) return apiError('Grupo não encontrado', 404)

  return NextResponse.json({ success: true })
})
