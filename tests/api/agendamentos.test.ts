import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsonRequest, simpleRequest, ctx, leanQuery } from './helpers'

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/models/Agendamento', () => ({
  default: { find: vi.fn(), create: vi.fn(), findById: vi.fn(), findByIdAndUpdate: vi.fn(), findByIdAndDelete: vi.fn() },
}))
// scheduleSync é fire-and-forget; mockamos para não tocar a rede/DB
vi.mock('@/lib/scheduleSync', () => ({
  resolveNodeIds: vi.fn().mockResolvedValue([]),
  syncNodeSchedules: vi.fn().mockResolvedValue(undefined),
}))

import { getServerSession } from 'next-auth/next'
import AgendamentoModel from '@/models/Agendamento'
import { GET, POST } from '@/app/api/agendamentos/route'
import { PUT, DELETE } from '@/app/api/agendamentos/[id]/route'

const session = vi.mocked(getServerSession)
const OID = '507f1f77bcf86cd799439011'
const OID2 = '507f1f77bcf86cd799439012'

beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue({ user: {} } as never)
})

describe('GET /api/agendamentos', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('200 lista com populate', async () => {
    ;(AgendamentoModel.find as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery([{ _id: '1' }]))
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/agendamentos', () => {
  it('400 sem audioId válido', async () => {
    const res = await POST(jsonRequest('/api/agendamentos', 'POST', { audioId: 'xx', nosIds: [OID2], dataHora: '2026-06-12T08:00:00' }))
    expect(res.status).toBe(400)
  })

  it('400 sem destino', async () => {
    const res = await POST(jsonRequest('/api/agendamentos', 'POST', { audioId: OID, dataHora: '2026-06-12T08:00:00' }))
    expect(res.status).toBe(400)
  })

  it('201 cria agendamento único', async () => {
    ;(AgendamentoModel.create as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: '1' })
    const res = await POST(
      jsonRequest('/api/agendamentos', 'POST', { audioId: OID, nosIds: [OID2], dataHora: '2026-06-12T08:00:00' })
    )
    expect(res.status).toBe(201)
    expect(AgendamentoModel.create).toHaveBeenCalled()
  })

  it('400 recorrente sem cron válido', async () => {
    const res = await POST(
      jsonRequest('/api/agendamentos', 'POST', {
        audioId: OID,
        nosIds: [OID2],
        dataHora: '2026-06-12T08:00:00',
        recorrente: true,
      })
    )
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/agendamentos/[id]', () => {
  it('404 quando não existe', async () => {
    ;(AgendamentoModel.findById as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery(null))
    const res = await PUT(jsonRequest('/api/agendamentos/1', 'PUT', { status: 'executado' }), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 atualiza status', async () => {
    ;(AgendamentoModel.findById as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery({ nos: [], grupos: [] }))
    ;(AgendamentoModel.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: '1', nos: [], grupos: [] })
    const res = await PUT(jsonRequest('/api/agendamentos/1', 'PUT', { status: 'executado' }), ctx({ id: '1' }))
    expect(res.status).toBe(200)
    const updateArg = (AgendamentoModel.findByIdAndUpdate as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(updateArg).toEqual({ status: 'executado' })
  })

  it('400 com status fora do enum', async () => {
    const res = await PUT(jsonRequest('/api/agendamentos/1', 'PUT', { status: 'qualquer' }), ctx({ id: '1' }))
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/agendamentos/[id]', () => {
  it('404 quando não existe', async () => {
    ;(AgendamentoModel.findByIdAndDelete as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await DELETE(simpleRequest('/api/agendamentos/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 remove agendamento', async () => {
    ;(AgendamentoModel.findByIdAndDelete as ReturnType<typeof vi.fn>).mockResolvedValue({ nos: [], grupos: [] })
    const res = await DELETE(simpleRequest('/api/agendamentos/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })
})
