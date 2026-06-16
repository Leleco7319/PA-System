import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsonRequest, simpleRequest, ctx, leanQuery } from './helpers'

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/models/Grupo', () => ({
  default: { find: vi.fn(), create: vi.fn(), findByIdAndUpdate: vi.fn(), findByIdAndDelete: vi.fn() },
}))

import { getServerSession } from 'next-auth/next'
import GrupoModel from '@/models/Grupo'
import { GET, POST } from '@/app/api/grupos/route'
import { PUT, DELETE } from '@/app/api/grupos/[id]/route'

const session = vi.mocked(getServerSession)
const OID = '507f1f77bcf86cd799439011'

beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue({ user: {} } as never)
})

describe('GET /api/grupos', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('200 lista grupos', async () => {
    ;(GrupoModel.find as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery([{ nome: 'g' }]))
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ nome: 'g' }])
  })
})

describe('POST /api/grupos', () => {
  it('400 sem nome', async () => {
    const res = await POST(jsonRequest('/api/grupos', 'POST', { descricao: 'x' }))
    expect(res.status).toBe(400)
  })

  it('201 cria grupo', async () => {
    ;(GrupoModel.create as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: '1', nome: 'Bloco A' })
    const res = await POST(jsonRequest('/api/grupos', 'POST', { nome: 'Bloco A', nosIds: [OID] }))
    expect(res.status).toBe(201)
    expect(GrupoModel.create).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Bloco A', nos: [OID] }))
  })
})

describe('PUT /api/grupos/[id]', () => {
  it('404 quando não existe', async () => {
    ;(GrupoModel.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await PUT(jsonRequest('/api/grupos/1', 'PUT', { nome: 'Novo' }), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 atualiza apenas campos da whitelist', async () => {
    ;(GrupoModel.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: '1', nome: 'Novo' })
    const res = await PUT(
      jsonRequest('/api/grupos/1', 'PUT', { nome: 'Novo', hacker: 'x' }),
      ctx({ id: '1' })
    )
    expect(res.status).toBe(200)
    const updateArg = (GrupoModel.findByIdAndUpdate as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(updateArg).not.toHaveProperty('hacker')
    expect(updateArg).toEqual({ nome: 'Novo' })
  })
})

describe('DELETE /api/grupos/[id]', () => {
  it('404 quando não existe', async () => {
    ;(GrupoModel.findByIdAndDelete as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await DELETE(simpleRequest('/api/grupos/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 remove grupo', async () => {
    ;(GrupoModel.findByIdAndDelete as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: '1' })
    const res = await DELETE(simpleRequest('/api/grupos/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(200)
  })
})
