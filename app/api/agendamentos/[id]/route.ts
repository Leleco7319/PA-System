import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import AgendamentoModel from '@/models/Agendamento'
import { resolveNodeIds, syncNodeSchedules } from '@/lib/scheduleSync'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  await connectDB()

  // Capture the old node targets before updating
  const existing = await AgendamentoModel.findById(id).lean()
  if (!existing) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

  const agendamento = await AgendamentoModel.findByIdAndUpdate(id, body, { new: true })
  if (!agendamento) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

  // Sync both old and new target nodes (union) so no stale entries remain
  const oldNosIds = existing.nos.map(n => n.toString())
  const oldGruposIds = existing.grupos.map(g => g.toString())
  const newNosIds = (body.nos ?? agendamento.nos).map((n: { toString(): string }) => n.toString())
  const newGruposIds = (body.grupos ?? agendamento.grupos).map((g: { toString(): string }) => g.toString())

  resolveNodeIds([...new Set([...oldNosIds, ...newNosIds])], [...new Set([...oldGruposIds, ...newGruposIds])])
    .then(nodeIds => syncNodeSchedules(nodeIds))
    .catch(err => console.error('[agendamentos] sync error:', err))

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

  // Re-sync affected nodes (the deleted schedule must be removed from their list)
  const nosIds = agendamento.nos.map(n => n.toString())
  const gruposIds = agendamento.grupos.map(g => g.toString())

  resolveNodeIds(nosIds, gruposIds)
    .then(nodeIds => syncNodeSchedules(nodeIds))
    .catch(err => console.error('[agendamentos] sync error:', err))

  return NextResponse.json({ success: true })
}

