import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AgendamentoModel from '@/models/Agendamento'
import { resolveNodeIds, syncNodeSchedules } from '@/lib/scheduleSync'
import { apiError, handleRoute, parseBody, requireSession } from '@/lib/api-utils'
import { agendamentoUpdateSchema } from '@/lib/validators'

export const PUT = handleRoute(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  const parsed = await parseBody(request, agendamentoUpdateSchema)
  if (parsed.error) return parsed.error
  const update = parsed.data

  await connectDB()

  // Capture the old node targets before updating
  const existing = await AgendamentoModel.findById(id).lean()
  if (!existing) return apiError('Agendamento não encontrado', 404)

  const agendamento = await AgendamentoModel.findByIdAndUpdate(id, update, { new: true })
  if (!agendamento) return apiError('Agendamento não encontrado', 404)

  // Sync both old and new target nodes (union) so no stale entries remain
  const oldNosIds = existing.nos.map((n: { toString(): string }) => n.toString())
  const oldGruposIds = existing.grupos.map((g: { toString(): string }) => g.toString())
  const newNosIds = update.nos ?? agendamento.nos.map((n: { toString(): string }) => n.toString())
  const newGruposIds = update.grupos ?? agendamento.grupos.map((g: { toString(): string }) => g.toString())

  resolveNodeIds([...new Set([...oldNosIds, ...newNosIds])], [...new Set([...oldGruposIds, ...newGruposIds])])
    .then(nodeIds => syncNodeSchedules(nodeIds))
    .catch(err => console.error('[agendamentos] sync error:', err))

  return NextResponse.json(agendamento)
})

export const DELETE = handleRoute(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  await connectDB()

  const agendamento = await AgendamentoModel.findByIdAndDelete(id)
  if (!agendamento) return apiError('Agendamento não encontrado', 404)

  // Re-sync affected nodes (the deleted schedule must be removed from their list)
  const nosIds = agendamento.nos.map((n: { toString(): string }) => n.toString())
  const gruposIds = agendamento.grupos.map((g: { toString(): string }) => g.toString())

  resolveNodeIds(nosIds, gruposIds)
    .then(nodeIds => syncNodeSchedules(nodeIds))
    .catch(err => console.error('[agendamentos] sync error:', err))

  return NextResponse.json({ success: true })
})
