import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import GrupoModel from '@/models/Grupo'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const grupos = await GrupoModel.find()
    .populate('nos', 'nome ip online ultimoHeartbeat')
    .sort({ nome: 1 })
    .lean()
  return NextResponse.json(grupos)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { nome, descricao = '', nosIds = [] } = body

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  await connectDB()
  const grupo = await GrupoModel.create({ nome: nome.trim(), descricao, nos: nosIds })
  return NextResponse.json(grupo, { status: 201 })
}
