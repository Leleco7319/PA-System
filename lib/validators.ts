import { z } from 'zod'

/**
 * Schemas de validação dos bodies das rotas de API.
 * Nenhum schema usa `.strict()`: campos extras são ignorados de propósito
 * para não rejeitar payloads de firmwares ESP32 mais antigos.
 */

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'ID inválido')

// ─── Cron (formato consumido pelo firmware: "min hora * * dias") ─────────────

const CRON_DAYS_REGEX = /^(\*|[0-7](?:-[0-7])?(?:,[0-7](?:-[0-7])?)*)$/

export function isCronValido(cron: string): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const minute = Number(parts[0])
  const hour = Number(parts[1])
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return false
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false
  return CRON_DAYS_REGEX.test(parts[4])
}

// ─── IP v4 ────────────────────────────────────────────────────────────────────

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

export function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false
  return ip.split('.').every((octet) => parseInt(octet, 10) <= 255)
}

// ─── Agendamentos ─────────────────────────────────────────────────────────────

export const agendamentoCreateSchema = z
  .object({
    audioId: objectId,
    nosIds: z.array(objectId).default([]),
    gruposIds: z.array(objectId).default([]),
    dataHora: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'dataHora inválida'),
    recorrente: z.boolean().default(false),
    cron: z.string().optional(),
  })
  .refine((d) => d.nosIds.length > 0 || d.gruposIds.length > 0, 'Selecione ao menos um nó ou grupo')
  .refine(
    (d) => !d.recorrente || (d.cron !== undefined && isCronValido(d.cron)),
    'Agendamento recorrente exige expressão cron válida (5 campos)'
  )

/** PUT: apenas campos da whitelist podem ser atualizados. */
export const agendamentoUpdateSchema = z
  .object({
    audio: objectId.optional(),
    nos: z.array(objectId).optional(),
    grupos: z.array(objectId).optional(),
    dataHora: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), 'dataHora inválida')
      .optional(),
    recorrente: z.boolean().optional(),
    cron: z.string().refine(isCronValido, 'Expressão cron inválida').optional(),
    status: z.enum(['pendente', 'executado', 'falhou']).optional(),
  })

// ─── Grupos ───────────────────────────────────────────────────────────────────

export const grupoCreateSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório'),
  descricao: z.string().default(''),
  nosIds: z.array(objectId).default([]),
})

export const grupoUpdateSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').optional(),
  descricao: z.string().optional(),
  nosIds: z.array(objectId).optional(),
})

// ─── On-Demand ────────────────────────────────────────────────────────────────

export const onDemandSchema = z
  .object({
    audioId: objectId,
    nosIds: z.array(objectId).default([]),
    gruposIds: z.array(objectId).default([]),
  })
  .refine((d) => d.nosIds.length > 0 || d.gruposIds.length > 0, 'Selecione ao menos um nó ou grupo')

// ─── ESP Config (pacote UDP) ──────────────────────────────────────────────────

export const espConfigSchema = z.object({
  ip: z.string().refine(isValidIp, 'IP inválido'),
  port: z.coerce.number().int().min(1, 'Porta inválida (1–65535)').max(65535, 'Porta inválida (1–65535)'),
  wifiSSID: z.string().default(''),
  wifiPassword: z.string().default(''),
  hostname: z.string().default(''),
  volume: z.coerce.number().int().min(0, 'Volume inválido (0–100)').max(100, 'Volume inválido (0–100)'),
  ServerURL: z.string().default(''),
  apiToken: z.string().default(''),
})

// ─── Rotas /api/node/* (payloads dos ESP32) ───────────────────────────────────
// Espelham as validações manuais antigas: apenas presença dos campos.
// `status` continua string livre para não quebrar firmwares com valores novos.

export const nodeRegisterSchema = z.object({
  macAddress: z.string().min(1, 'macAddress e ip são obrigatórios'),
  ip: z.string().min(1, 'macAddress e ip são obrigatórios'),
  versaoFirmware: z.string().optional(),
  nome: z.string().optional(),
})

export const nodeHeartbeatSchema = z.object({
  macAddress: z.string().min(1, 'macAddress obrigatório'),
  ip: z.string().optional(),
})

export const nodeStatusSchema = z.object({
  macAddress: z.string().min(1, 'macAddress obrigatório'),
  arquivo: z.string().min(1, 'arquivo obrigatório'),
  status: z.string().min(1, 'status obrigatório'),
  mensagem: z.string().optional(),
})
