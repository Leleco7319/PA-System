import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { jsonRequest, simpleRequest, ctx, leanQuery } from './helpers'

// Infra comum mockada
vi.mock('@/lib/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/models/No', () => ({
  default: { findOneAndUpdate: vi.fn(), findOne: vi.fn() },
}))
vi.mock('@/models/Audio', () => ({ default: { find: vi.fn() } }))

// fs para a rota de download
vi.mock('fs', () => ({ existsSync: vi.fn() }))
vi.mock('fs/promises', () => ({ readFile: vi.fn() }))

import NoModel from '@/models/No'
import AudioModel from '@/models/Audio'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

import { POST as registerPOST } from '@/app/api/node/register/route'
import { POST as heartbeatPOST } from '@/app/api/node/heartbeat/route'
import { GET as filesGET } from '@/app/api/node/files/route'
import { POST as statusPOST } from '@/app/api/node/status/route'
import { GET as downloadGET } from '@/app/api/node/download/[filename]/route'
import { GET as pingGET } from '@/app/api/node/ping/route'

const KEY = 'chave-de-teste'
const KEY_HEADER = { 'x-node-key': KEY }

const original = process.env.NODE_API_KEY
beforeEach(() => {
  vi.clearAllMocks()
  process.env.NODE_API_KEY = KEY
})
afterAll(() => {
  process.env.NODE_API_KEY = original
})

describe('POST /api/node/register', () => {
  it('401 sem x-node-key', async () => {
    const res = await registerPOST(jsonRequest('/api/node/register', 'POST', { macAddress: 'AA', ip: '1.1.1.1' }))
    expect(res.status).toBe(401)
  })

  it('400 sem macAddress', async () => {
    const res = await registerPOST(jsonRequest('/api/node/register', 'POST', { ip: '1.1.1.1' }, KEY_HEADER))
    expect(res.status).toBe(400)
  })

  it('200 e retorna noId no happy path (shape do firmware)', async () => {
    ;(NoModel.findOneAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'no123' })
    const res = await registerPOST(
      jsonRequest('/api/node/register', 'POST', { macAddress: 'AA:BB', ip: '1.1.1.1', versaoFirmware: '1.0' }, KEY_HEADER)
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, noId: 'no123' })
  })
})

describe('POST /api/node/heartbeat', () => {
  it('401 sem key', async () => {
    const res = await heartbeatPOST(jsonRequest('/api/node/heartbeat', 'POST', { macAddress: 'AA' }))
    expect(res.status).toBe(401)
  })

  it('400 sem macAddress', async () => {
    const res = await heartbeatPOST(jsonRequest('/api/node/heartbeat', 'POST', {}, KEY_HEADER))
    expect(res.status).toBe(400)
  })

  it('404 quando o nó não está registrado', async () => {
    ;(NoModel.findOneAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await heartbeatPOST(jsonRequest('/api/node/heartbeat', 'POST', { macAddress: 'AA' }, KEY_HEADER))
    expect(res.status).toBe(404)
  })

  it('200 happy path', async () => {
    ;(NoModel.findOneAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'x' })
    const res = await heartbeatPOST(
      jsonRequest('/api/node/heartbeat', 'POST', { macAddress: 'AA', ip: '2.2.2.2' }, KEY_HEADER)
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })
})

describe('GET /api/node/files', () => {
  it('401 sem key', async () => {
    const res = await filesGET(simpleRequest('/api/node/files'))
    expect(res.status).toBe(401)
  })

  it('200 com lista { files: [{ filename, checksum, size }] } (contrato firmware)', async () => {
    ;(AudioModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      leanQuery([{ nomeArquivo: 'a.mp3', checksum: 'abc', tamanho: 123 }])
    )
    const res = await filesGET(simpleRequest('/api/node/files', 'GET', KEY_HEADER))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ files: [{ filename: 'a.mp3', checksum: 'abc', size: 123 }] })
  })
})

describe('POST /api/node/status', () => {
  it('401 sem key', async () => {
    const res = await statusPOST(jsonRequest('/api/node/status', 'POST', {}))
    expect(res.status).toBe(401)
  })

  it('400 sem campos obrigatórios', async () => {
    const res = await statusPOST(jsonRequest('/api/node/status', 'POST', { macAddress: 'AA' }, KEY_HEADER))
    expect(res.status).toBe(400)
  })

  it('404 quando o nó não existe', async () => {
    ;(NoModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await statusPOST(
      jsonRequest('/api/node/status', 'POST', { macAddress: 'AA', arquivo: 'a.mp3', status: 'concluido' }, KEY_HEADER)
    )
    expect(res.status).toBe(404)
  })

  it('200 happy path', async () => {
    ;(NoModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'x' })
    const res = await statusPOST(
      jsonRequest('/api/node/status', 'POST', { macAddress: 'AA', arquivo: 'a.mp3', status: 'reproduzindo' }, KEY_HEADER)
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })
})

describe('GET /api/node/download/[filename]', () => {
  it('401 sem key', async () => {
    const res = await downloadGET(simpleRequest('/api/node/download/a.mp3'), ctx({ filename: 'a.mp3' }))
    expect(res.status).toBe(401)
  })

  it('404 quando o arquivo não existe', async () => {
    ;(existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false)
    const res = await downloadGET(simpleRequest('/api/node/download/x.mp3', 'GET', KEY_HEADER), ctx({ filename: 'x.mp3' }))
    expect(res.status).toBe(404)
  })

  it('200 com Content-Type de áudio no happy path', async () => {
    ;(existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true)
    ;(readFile as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('dados'))
    const res = await downloadGET(simpleRequest('/api/node/download/a.mp3', 'GET', KEY_HEADER), ctx({ filename: 'a.mp3' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg')
  })

  it('previne path traversal usando basename', async () => {
    ;(existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false)
    await downloadGET(
      simpleRequest('/api/node/download/..%2F..%2Fsecret', 'GET', KEY_HEADER),
      ctx({ filename: '../../secret' })
    )
    const caminho = (existsSync as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(caminho).not.toContain('..')
  })
})

describe('GET /api/node/ping', () => {
  it('200 público (sem autenticação)', async () => {
    const res = await pingGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pong).toBe(true)
  })
})
