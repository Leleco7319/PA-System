import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import AgendamentoModel from '@/models/Agendamento'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  await connectDB()
  const agendamento = await AgendamentoModel.findByIdAndUpdate(id, body, { new: true })
  if (!agendamento) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

  return NextResponse.json(agendamento)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const agendamento = await AgendamentoModel.findByIdAndDelete(id)
  if (!agendamento) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

  return NextResponse.json({ success: true })
}
