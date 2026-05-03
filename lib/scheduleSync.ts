import NoModel from '@/models/No'
import GrupoModel from '@/models/Grupo'
import AgendamentoModel from '@/models/Agendamento'
import type { IAgendamento, IAudio, IGrupo, INo } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EspScheduleEntry {
  hour: number
  minute: number
  days: number     // bitmask: bit0=Sun … bit6=Sat (0x7F = every day)
  filename: string
}

type PopulatedAgendamento = Omit<IAgendamento, 'audio'> & { audio: IAudio }

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a cron day-of-week field (e.g. "*", "1,5", "1-5") to the ESP32
 * bitmask where bit0=Sunday, bit1=Monday … bit6=Saturday.
 * Cron uses 0=Sun…6=Sat (7 is also treated as Sun).
 */
function cronDaysToBitmask(field: string): number {
  if (field === '*') return 0x7f
  let mask = 0
  for (const part of field.split(',')) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      for (let d = start; d <= end; d++) mask |= 1 << (d % 7)
    } else {
      mask |= 1 << (Number(part) % 7)
    }
  }
  return mask
}

function agendamentoToEspEntry(ag: PopulatedAgendamento): EspScheduleEntry | null {
  if (!ag.audio?.nomeArquivo) return null

  if (ag.recorrente && ag.cron) {
    const parts = ag.cron.trim().split(/\s+/)
    if (parts.length < 5) return null
    const minute = parseInt(parts[0], 10)
    const hour = parseInt(parts[1], 10)
    if (isNaN(hour) || isNaN(minute)) return null
    return { hour, minute, days: cronDaysToBitmask(parts[4]), filename: ag.audio.nomeArquivo }
  }

  // One-time: fire only on the specific weekday of dataHora
  const d = new Date(ag.dataHora)
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
    days: 1 << d.getDay(), // 0=Sun…6=Sat maps directly to bit position
    filename: ag.audio.nomeArquivo,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Expands nosIds + gruposIds into a de-duplicated list of node ID strings.
 * Call this before saving an agendamento so you can pass the list to
 * syncNodeSchedules after the save.
 */
export async function resolveNodeIds(nosIds: string[], gruposIds: string[]): Promise<string[]> {
  const ids = new Set<string>(nosIds)

  if (gruposIds.length > 0) {
    const groups = await GrupoModel.find({ _id: { $in: gruposIds } })
      .select('nos')
      .lean<Pick<IGrupo, 'nos'>[]>()
    for (const g of groups) {
      for (const nId of g.nos) ids.add(nId.toString())
    }
  }

  return Array.from(ids)
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
