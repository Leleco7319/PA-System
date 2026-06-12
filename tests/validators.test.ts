import { describe, it, expect } from 'vitest'
import {
  isCronValido,
  isValidIp,
  agendamentoCreateSchema,
  agendamentoUpdateSchema,
  grupoCreateSchema,
  onDemandSchema,
  espConfigSchema,
  nodeRegisterSchema,
  nodeHeartbeatSchema,
  nodeStatusSchema,
} from '@/lib/validators'

const OID = '507f1f77bcf86cd799439011'
const OID2 = '507f1f77bcf86cd799439012'

describe('isCronValido', () => {
  it('aceita cron de 5 campos válido', () => {
    expect(isCronValido('30 14 * * 1-5')).toBe(true)
    expect(isCronValido('0 0 * * *')).toBe(true)
    expect(isCronValido('59 23 * * 0,6')).toBe(true)
  })

  it('rejeita número errado de campos', () => {
    expect(isCronValido('30 14 *')).toBe(false)
    expect(isCronValido('30 14 * * 1 7')).toBe(false)
  })

  it('rejeita hora/minuto fora do intervalo', () => {
    expect(isCronValido('60 14 * * *')).toBe(false)
    expect(isCronValido('30 24 * * *')).toBe(false)
  })

  it('rejeita campo de dias inválido', () => {
    expect(isCronValido('30 14 * * abc')).toBe(false)
    expect(isCronValido('30 14 * * 8')).toBe(false)
  })
})

describe('isValidIp', () => {
  it('aceita IPs válidos', () => {
    expect(isValidIp('192.168.1.10')).toBe(true)
    expect(isValidIp('10.0.0.1')).toBe(true)
  })

  it('rejeita octetos > 255 e formatos inválidos', () => {
    expect(isValidIp('999.1.1.1')).toBe(false)
    expect(isValidIp('192.168.1')).toBe(false)
    expect(isValidIp('abc')).toBe(false)
  })
})

describe('agendamentoCreateSchema', () => {
  it('aceita agendamento único válido', () => {
    const r = agendamentoCreateSchema.safeParse({
      audioId: OID,
      nosIds: [OID2],
      dataHora: '2026-06-12T08:00:00',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.gruposIds).toEqual([]) // default aplicado
      expect(r.data.recorrente).toBe(false)
    }
  })

  it('rejeita audioId que não é ObjectId', () => {
    const r = agendamentoCreateSchema.safeParse({
      audioId: '123',
      nosIds: [OID2],
      dataHora: '2026-06-12T08:00:00',
    })
    expect(r.success).toBe(false)
  })

  it('rejeita quando não há nós nem grupos', () => {
    const r = agendamentoCreateSchema.safeParse({
      audioId: OID,
      dataHora: '2026-06-12T08:00:00',
    })
    expect(r.success).toBe(false)
  })

  it('rejeita data inválida', () => {
    const r = agendamentoCreateSchema.safeParse({
      audioId: OID,
      nosIds: [OID2],
      dataHora: 'not-a-date',
    })
    expect(r.success).toBe(false)
  })

  it('exige cron válido quando recorrente', () => {
    const semCron = agendamentoCreateSchema.safeParse({
      audioId: OID,
      nosIds: [OID2],
      dataHora: '2026-06-12T08:00:00',
      recorrente: true,
    })
    expect(semCron.success).toBe(false)

    const comCron = agendamentoCreateSchema.safeParse({
      audioId: OID,
      nosIds: [OID2],
      dataHora: '2026-06-12T08:00:00',
      recorrente: true,
      cron: '0 8 * * 1-5',
    })
    expect(comCron.success).toBe(true)
  })
})

describe('agendamentoUpdateSchema', () => {
  it('ignora campos fora da whitelist', () => {
    const r = agendamentoUpdateSchema.safeParse({ status: 'executado', hacker: 'x' })
    expect(r.success).toBe(true)
    if (r.success) expect('hacker' in r.data).toBe(false)
  })

  it('rejeita status fora do enum', () => {
    const r = agendamentoUpdateSchema.safeParse({ status: 'qualquer' })
    expect(r.success).toBe(false)
  })
})

describe('grupoCreateSchema', () => {
  it('exige nome não-vazio e aplica defaults', () => {
    const r = grupoCreateSchema.safeParse({ nome: 'Bloco A' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.descricao).toBe('')
      expect(r.data.nosIds).toEqual([])
    }
  })

  it('rejeita nome vazio', () => {
    expect(grupoCreateSchema.safeParse({ nome: '   ' }).success).toBe(false)
  })
})

describe('onDemandSchema', () => {
  it('exige ao menos um destino', () => {
    expect(onDemandSchema.safeParse({ audioId: OID }).success).toBe(false)
    expect(onDemandSchema.safeParse({ audioId: OID, gruposIds: [OID2] }).success).toBe(true)
  })
})

describe('espConfigSchema', () => {
  it('aceita config válida e coage strings numéricas', () => {
    const r = espConfigSchema.safeParse({
      ip: '192.168.1.50',
      port: '5005',
      volume: '80',
      mqttPort: '1883',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.port).toBe(5005)
      expect(r.data.volume).toBe(80)
    }
  })

  it('rejeita volume fora de 0–100', () => {
    expect(
      espConfigSchema.safeParse({ ip: '192.168.1.50', port: '5005', volume: '101', mqttPort: '1883' }).success
    ).toBe(false)
  })

  it('rejeita porta fora de 1–65535', () => {
    expect(
      espConfigSchema.safeParse({ ip: '192.168.1.50', port: '0', volume: '50', mqttPort: '1883' }).success
    ).toBe(false)
  })

  it('rejeita IP inválido', () => {
    expect(
      espConfigSchema.safeParse({ ip: '999.0.0.1', port: '5005', volume: '50', mqttPort: '1883' }).success
    ).toBe(false)
  })
})

describe('schemas de /api/node/*', () => {
  it('nodeRegisterSchema exige macAddress e ip', () => {
    expect(nodeRegisterSchema.safeParse({ macAddress: 'AA:BB', ip: '1.2.3.4' }).success).toBe(true)
    expect(nodeRegisterSchema.safeParse({ macAddress: 'AA:BB' }).success).toBe(false)
  })

  it('nodeHeartbeatSchema exige macAddress, ip opcional', () => {
    expect(nodeHeartbeatSchema.safeParse({ macAddress: 'AA:BB' }).success).toBe(true)
    expect(nodeHeartbeatSchema.safeParse({}).success).toBe(false)
  })

  it('nodeStatusSchema exige macAddress, arquivo e status', () => {
    expect(
      nodeStatusSchema.safeParse({ macAddress: 'AA:BB', arquivo: 'x.mp3', status: 'reproduzindo' }).success
    ).toBe(true)
    expect(nodeStatusSchema.safeParse({ macAddress: 'AA:BB', arquivo: 'x.mp3' }).success).toBe(false)
  })
})
