/**
 * Conversão de agendamentos para o formato consumido pelo firmware ESP32.
 * Módulo puro (sem mongoose) — o shape de EspScheduleEntry é contrato com o
 * firmware e não pode mudar.
 */

export interface EspScheduleEntry {
  hour: number
  minute: number
  days: number // bitmask: bit0=Dom … bit6=Sáb (0x7F = todos os dias)
  filename: string
}

/** Subconjunto de IAgendamento (populado) necessário para gerar a entrada. */
export interface AgendamentoLike {
  recorrente: boolean
  cron?: string | null
  dataHora: Date | string
  audio?: { nomeArquivo?: string } | null
}

/**
 * Converte o campo day-of-week de um cron (ex.: "*", "1,5", "1-5") para a
 * bitmask do ESP32 (bit0=Dom, bit1=Seg … bit6=Sáb).
 * Cron usa 0=Dom…6=Sáb (7 também é tratado como Dom).
 */
export function cronDaysToBitmask(field: string): number {
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

export function agendamentoToEspEntry(ag: AgendamentoLike): EspScheduleEntry | null {
  if (!ag.audio?.nomeArquivo) return null

  if (ag.recorrente && ag.cron) {
    const parts = ag.cron.trim().split(/\s+/)
    if (parts.length < 5) return null
    const minute = parseInt(parts[0], 10)
    const hour = parseInt(parts[1], 10)
    if (isNaN(hour) || isNaN(minute)) return null
    return { hour, minute, days: cronDaysToBitmask(parts[4]), filename: ag.audio.nomeArquivo }
  }

  // Único: dispara apenas no dia da semana de dataHora
  const d = new Date(ag.dataHora)
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
    days: 1 << d.getDay(), // 0=Dom…6=Sáb mapeia direto para a posição do bit
    filename: ag.audio.nomeArquivo,
  }
}
