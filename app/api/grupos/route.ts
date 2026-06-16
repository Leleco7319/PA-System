import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import GrupoModel from '@/models/Grupo'
import { apiError, handleRoute, parseBody, requireSession } from '@/lib/api-utils'
import { grupoCreateSchema } from '@/lib/validators'

export const GET = handleRoute(async () => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  await connectDB()
  const grupos = await GrupoModel.find()
    .populate('nos', 'nome ip online ultimoHeartbeat')
    .sort({ nome: 1 })
    .lean()
  return NextResponse.json(grupos)
})

export const POST = handleRoute(async (request: NextRequest) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const parsed = await parseBody(request, grupoCreateSchema)
  if (parsed.error) return parsed.error
  const { nome, descricao, nosIds } = parsed.data

  await connectDB()
  const grupo = await GrupoModel.create({ nome, descricao, nos: nosIds })
  return NextResponse.json(grupo, { status: 201 })
})
