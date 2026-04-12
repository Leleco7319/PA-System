import { Types } from 'mongoose'

// ---- Enums ----

export type AgendamentoStatus = 'pendente' | 'executado' | 'falhou'
export type ReproducaoTipo = 'on-demand' | 'agendado'

// ---- Modelos serializados (retornados pela API como JSON) ----

export interface IUserJSON {
  _id: string
  nome: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface IAudioJSON {
  _id: string
  nome: string
  nomeArquivo: string
  tamanho: number
  duracao?: number
  checksum: string
  createdAt: string
}

export interface INoJSON {
  _id: string
  nome: string
  ip: string
  macAddress: string
  grupos: string[]
  online: boolean
  ultimoHeartbeat: string
  versaoFirmware: string
  createdAt: string
}

export interface IGrupoJSON {
  _id: string
  nome: string
  descricao: string
  nos: string[] | INoJSON[]
  createdAt: string
}

export interface IAgendamentoJSON {
  _id: string
  audio: string | IAudioJSON
  nos: string[] | INoJSON[]
  grupos: string[] | IGrupoJSON[]
  dataHora: string
  recorrente: boolean
  cron?: string
  status: AgendamentoStatus
  createdAt: string
}

// ---- Schemas Mongoose (documentos) ----

export interface IUser {
  _id: Types.ObjectId
  nome: string
  email: string
  senha: string
  createdAt: Date
  updatedAt: Date
}

export interface IAudio {
  _id: Types.ObjectId
  nome: string
  nomeArquivo: string
  tamanho: number
  duracao?: number
  checksum: string
  createdAt: Date
}

export interface INo {
  _id: Types.ObjectId
  nome: string
  ip: string
  macAddress: string
  grupos: Types.ObjectId[]
  online: boolean
  ultimoHeartbeat: Date
  versaoFirmware: string
  createdAt: Date
}

export interface IGrupo {
  _id: Types.ObjectId
  nome: string
  descricao: string
  nos: Types.ObjectId[]
  createdAt: Date
}

export interface IAgendamento {
  _id: Types.ObjectId
  audio: Types.ObjectId
  nos: Types.ObjectId[]
  grupos: Types.ObjectId[]
  dataHora: Date
  recorrente: boolean
  cron?: string
  status: AgendamentoStatus
  createdAt: Date
}

// ---- Requests / Payloads ----

export interface OnDemandPayload {
  audioId: string
  nosIds: string[]
  gruposIds: string[]
}

export interface NodeRegisterPayload {
  macAddress: string
  ip: string
  versaoFirmware: string
  nome?: string
}

export interface NodeHeartbeatPayload {
  macAddress: string
  ip?: string
}

export interface NodeStatusPayload {
  macAddress: string
  arquivo: string
  status: 'reproduzindo' | 'concluido' | 'erro'
  mensagem?: string
}
