import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AgendamentoModel from '@/models/Agendamento'
import { resolveNodeIds, syncNodeSchedules } from '@/lib/scheduleSync'
import { apiError, handleRoute, parseBody, requireSession } from '@/lib/api-utils'
import { agendamentoCreateSchema } from '@/lib/validators'

export const GET = handleRoute(async () => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  await connectDB()
  const agendamentos = await AgendamentoModel.find()
    .populate('audio', 'nome nomeArquivo')
    .populate('nos', 'nome ip online')
    .populate('grupos', 'nome')
    .sort({ dataHora: -1 })
    .lean()
  return NextResponse.json(agendamentos)
})

export const POST = handleRoute(async (request: NextRequest) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const parsed = await parseBody(request, agendamentoCreateSchema)
  if (parsed.error) return parsed.error
  const { audioId, nosIds, gruposIds, dataHora, recorrente, cron } = parsed.data

  await connectDB()
  const agendamento = await AgendamentoModel.create({
    audio: audioId,
    nos: nosIds,
    grupos: gruposIds,
    dataHora: new Date(dataHora),
    recorrente,
    cron: recorrente ? cron : undefined,
    status: 'pendente',
  })

  // Sync schedules to all targeted nodes (fire-and-forget; errors are logged)
  resolveNodeIds(nosIds, gruposIds)
    .then(nodeIds => syncNodeSchedules(nodeIds))
    .catch(err => console.error('[agendamentos] sync error:', err))

  return NextResponse.json(agendamento, { status: 201 })
})
