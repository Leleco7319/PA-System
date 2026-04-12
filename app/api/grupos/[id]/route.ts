import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import GrupoModel from '@/models/Grupo'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { nome, descricao, nosIds } = body

  const update: Record<string, unknown> = {}
  if (nome) update.nome = nome.trim()
  if (descricao !== undefined) update.descricao = descricao
  if (nosIds) update.nos = nosIds

  await connectDB()
  const grupo = await GrupoModel.findByIdAndUpdate(id, update, { new: true })
  if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })

  return NextResponse.json(grupo)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const grupo = await GrupoModel.findByIdAndDelete(id)
  if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })

  return NextResponse.json({ success: true })
}
