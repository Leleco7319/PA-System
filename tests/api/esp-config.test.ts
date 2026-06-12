import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jsonRequest } from './helpers'

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

// Mock do socket UDP: send() chama o callback sem erro
vi.mock('dgram', () => ({
  default: {
    createSocket: () => ({
      send: (_buf: Buffer, _o: number, _l: number, _p: number, _ip: string, cb: (e: Error | null) => void) => cb(null),
      close: vi.fn(),
    }),
  },
}))

import { getServerSession } from 'next-auth/next'
import { POST } from '@/app/api/esp-config/route'

const session = vi.mocked(getServerSession)

beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue({ user: {} } as never)
})

const valido = {
  ip: '192.168.1.50',
  port: '5005',
  wifiSSID: 'rede',
  wifiPassword: 'senha',
  hostname: 'alarm-1',
  volume: '80',
  mqttBroker: '192.168.1.100',
  mqttPort: '1883',
  apiToken: 'tok',
}

describe('POST /api/esp-config', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    expect((await POST(jsonRequest('/api/esp-config', 'POST', valido))).status).toBe(401)
  })

  it('400 com IP inválido', async () => {
    const res = await POST(jsonRequest('/api/esp-config', 'POST', { ...valido, ip: '999.0.0.1' }))
    expect(res.status).toBe(400)
  })

  it('400 com volume fora do intervalo', async () => {
    const res = await POST(jsonRequest('/api/esp-config', 'POST', { ...valido, volume: '150' }))
    expect(res.status).toBe(400)
  })

  it('200 envia o pacote UDP no happy path', async () => {
    const res = await POST(jsonRequest('/api/esp-config', 'POST', valido))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.sentTo).toBe('192.168.1.50:5005')
  })
})
