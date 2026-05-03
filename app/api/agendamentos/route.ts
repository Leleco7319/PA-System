import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import AgendamentoModel from '@/models/Agendamento'
import { resolveNodeIds, syncNodeSchedules } from '@/lib/scheduleSync'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const agendamentos = await AgendamentoModel.find()
    .populate('audio', 'nome nomeArquivo')
    .populate('nos', 'nome ip online')
    .populate('grupos', 'nome')
    .sort({ dataHora: -1 })
    .lean()
  return NextResponse.json(agendamentos)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { audioId, nosIds = [], gruposIds = [], dataHora, recorrente = false, cron } = body

  if (!audioId) return NextResponse.json({ error: 'audioId obrigatório' }, { status: 400 })
  if (!dataHora) return NextResponse.json({ error: 'dataHora obrigatório' }, { status: 400 })
  if (nosIds.length === 0 && gruposIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos um nó ou grupo' }, { status: 400 })
  }

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
}
