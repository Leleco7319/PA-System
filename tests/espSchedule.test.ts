import { describe, it, expect } from 'vitest'
import { cronDaysToBitmask, agendamentoToEspEntry } from '@/lib/espSchedule'

describe('cronDaysToBitmask', () => {
  it('* equivale a todos os dias (0x7F)', () => {
    expect(cronDaysToBitmask('*')).toBe(0x7f)
  })

  it('dias úteis 1-5 = Seg..Sex', () => {
    // bits 1..5 = 0b0111110 = 0x3E
    expect(cronDaysToBitmask('1-5')).toBe(0x3e)
  })

  it('fim de semana 0,6 = Dom + Sáb', () => {
    // bit0 (Dom) + bit6 (Sáb) = 0b1000001 = 0x41
    expect(cronDaysToBitmask('0,6')).toBe(0x41)
  })

  it('7 é tratado como Domingo (bit0)', () => {
    expect(cronDaysToBitmask('7')).toBe(0x01)
  })

  it('combina listas e intervalos', () => {
    // 1-2 (Seg,Ter) + 5 (Sex) = bits 1,2,5 = 0b0100110 = 0x26
    expect(cronDaysToBitmask('1-2,5')).toBe(0x26)
  })
})

describe('agendamentoToEspEntry', () => {
  it('retorna null sem nome de arquivo', () => {
    expect(
      agendamentoToEspEntry({ recorrente: false, dataHora: '2026-06-12T08:00:00', audio: null })
    ).toBeNull()
    expect(
      agendamentoToEspEntry({ recorrente: false, dataHora: '2026-06-12T08:00:00', audio: { nomeArquivo: '' } })
    ).toBeNull()
  })

  it('agendamento recorrente extrai hora/minuto/dias do cron', () => {
    const entry = agendamentoToEspEntry({
      recorrente: true,
      cron: '30 14 * * 1-5',
      dataHora: '2026-06-12T00:00:00',
      audio: { nomeArquivo: 'alarme.mp3' },
    })
    expect(entry).toEqual({ hour: 14, minute: 30, days: 0x3e, filename: 'alarme.mp3' })
  })

  it('cron malformado (menos de 5 campos) retorna null', () => {
    expect(
      agendamentoToEspEntry({
        recorrente: true,
        cron: '30 14 *',
        dataHora: '2026-06-12T00:00:00',
        audio: { nomeArquivo: 'x.mp3' },
      })
    ).toBeNull()
  })

  it('cron com hora não-numérica retorna null', () => {
    expect(
      agendamentoToEspEntry({
        recorrente: true,
        cron: 'mm hh * * *',
        dataHora: '2026-06-12T00:00:00',
        audio: { nomeArquivo: 'x.mp3' },
      })
    ).toBeNull()
  })

  it('agendamento único dispara apenas no dia da semana de dataHora', () => {
    // 2026-06-12 é uma sexta-feira (getDay() === 5) no fuso local
    const entry = agendamentoToEspEntry({
      recorrente: false,
      dataHora: new Date(2026, 5, 12, 9, 5), // 12 jun 2026 09:05 local
      audio: { nomeArquivo: 'aviso.mp3' },
    })
    expect(entry).toEqual({ hour: 9, minute: 5, days: 1 << 5, filename: 'aviso.mp3' })
  })
})
