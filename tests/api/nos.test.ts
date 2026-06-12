import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { simpleRequest, ctx, leanQuery } from './helpers'

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/models/No', () => ({
  default: { find: vi.fn(), findById: vi.fn(), findByIdAndDelete: vi.fn() },
}))

import { getServerSession } from 'next-auth/next'
import NoModel from '@/models/No'
import { GET as listGET } from '@/app/api/nos/route'
import { GET as oneGET, DELETE } from '@/app/api/nos/[id]/route'
import { POST as syncPOST } from '@/app/api/nos/[id]/sincronizar/route'

const session = vi.mocked(getServerSession)

beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue({ user: {} } as never)
})

describe('GET /api/nos', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    expect((await listGET()).status).toBe(401)
  })

  it('200 recalcula status online', async () => {
    ;(NoModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      leanQuery([{ nome: 'n1', ultimoHeartbeat: new Date() }])
    )
    const res = await listGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].online).toBe(true)
  })
})

describe('GET /api/nos/[id]', () => {
  it('404 quando não existe', async () => {
    ;(NoModel.findById as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery(null))
    const res = await oneGET(simpleRequest('/api/nos/1'), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 retorna o nó com status', async () => {
    ;(NoModel.findById as ReturnType<typeof vi.fn>).mockReturnValue(
      leanQuery({ nome: 'n1', ultimoHeartbeat: new Date(0) })
    )
    const res = await oneGET(simpleRequest('/api/nos/1'), ctx({ id: '1' }))
    expect(res.status).toBe(200)
    expect((await res.json()).online).toBe(false)
  })
})

describe('DELETE /api/nos/[id]', () => {
  it('404 quando não existe', async () => {
    ;(NoModel.findByIdAndDelete as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await DELETE(simpleRequest('/api/nos/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 remove', async () => {
    ;(NoModel.findByIdAndDelete as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: '1' })
    const res = await DELETE(simpleRequest('/api/nos/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/nos/[id]/sincronizar', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('404 quando o nó não existe', async () => {
    ;(NoModel.findById as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery(null))
    const res = await syncPOST(simpleRequest('/api/nos/1/sincronizar', 'POST'), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 quando o ESP32 responde', async () => {
    ;(NoModel.findById as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery({ ip: '1.1.1.1' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    const res = await syncPOST(simpleRequest('/api/nos/1/sincronizar', 'POST'), ctx({ id: '1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, status: 200 })
  })

  it('502 quando o nó está inacessível', async () => {
    ;(NoModel.findById as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery({ ip: '1.1.1.1' }))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const res = await syncPOST(simpleRequest('/api/nos/1/sincronizar', 'POST'), ctx({ id: '1' }))
    expect(res.status).toBe(502)
  })
})
