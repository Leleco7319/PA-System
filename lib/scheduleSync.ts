import NoModel from '@/models/No'
import GrupoModel from '@/models/Grupo'
import AgendamentoModel from '@/models/Agendamento'
import type { IAgendamento, IAudio, IGrupo, INo } from '@/types'
import { agendamentoToEspEntry, type EspScheduleEntry } from '@/lib/espSchedule'

type PopulatedAgendamento = Omit<IAgendamento, 'audio'> & { audio: IAudio }

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Expands nosIds + gruposIds into a de-duplicated list of node documents
 * (direct targets + members of the targeted groups).
 */
export async function resolveNodes(nosIds: string[], gruposIds: string[]): Promise<INo[]> {
  const byId = new Map<string, INo>()

  if (nosIds.length > 0) {
    const diretos = await NoModel.find({ _id: { $in: nosIds } }).lean<INo[]>()
    for (const no of diretos) byId.set(String(no._id), no)
  }

  if (gruposIds.length > 0) {
    const grupos = await GrupoModel.find({ _id: { $in: gruposIds } })
      .populate<{ nos: INo[] }>('nos')
      .lean<(Omit<IGrupo, 'nos'> & { nos: INo[] })[]>()
    for (const g of grupos) {
      for (const no of g.nos) byId.set(String(no._id), no)
    }
  }

  return Array.from(byId.values())
}

/**
 * Expands nosIds + gruposIds into a de-duplicated list of node ID strings.
 * Call this before saving an agendamento so you can pass the list to
 * syncNodeSchedules after the save.
 */
export async function resolveNodeIds(nosIds: string[], gruposIds: string[]): Promise<string[]> {
  const nodes = await resolveNodes(nosIds, gruposIds)
  return nodes.map((n) => String(n._id))
}

/**
 * For each node in nodeIds:
 *  1. POST /sync  → triggers the ESP32 to download any missing audio files
 *  2. POST /schedule → pushes the full (re-built) schedule list to the node
 *
 * Failures are logged but never throw — schedule sync is best-effort.
 */
export async function syncNodeSchedules(nodeIds: string[]): Promise<void> {
  if (nodeIds.length === 0) return

  const nodes = await NoModel.find({ _id: { $in: nodeIds } })
    .lean<INo[]>()

  for (const node of nodes) {
    // All groups this node belongs to
    const groups = await GrupoModel.find({ nos: node._id })
      .select('_id')
      .lean<Pick<IGrupo, '_id'>[]>()
    const groupIds = groups.map(g => g._id)

    // All pending agendamentos that target this node (direct or via group)
    const orClauses: object[] = [{ nos: node._id }]
    if (groupIds.length > 0) orClauses.push({ grupos: { $in: groupIds } })

    const agendamentos = await AgendamentoModel.find({ status: 'pendente', $or: orClauses })
      .populate<{ audio: IAudio }>('audio', 'nomeArquivo')
      .lean<PopulatedAgendamento[]>()

    const scheduleEntries = agendamentos
      .map(agendamentoToEspEntry)
      .filter((e): e is EspScheduleEntry => e !== null)

    const url = `http://${node.ip}`

    // 1. Trigger file sync so the audio exists on SD before schedule fires
    try {
      await fetch(`${url}/sync`, { method: 'POST', signal: AbortSignal.timeout(5000) })
      console.log(`[scheduleSync] ${node.nome} /sync -> ok`)
    } catch (err) {
      console.error(`[scheduleSync] ${node.nome} /sync failed:`, err)
    }

    // 2. Push full schedule list
    try {
      const resp = await fetch(`${url}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: scheduleEntries }),
        signal: AbortSignal.timeout(5000),
      })
      console.log(`[scheduleSync] ${node.nome} /schedule (${scheduleEntries.length} entries) -> ${resp.status}`)
    } catch (err) {
      console.error(`[scheduleSync] ${node.nome} /schedule failed:`, err)
    }
  }
}
