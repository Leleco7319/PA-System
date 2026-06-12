import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simpleRequest, ctx, leanQuery } from './helpers'
import { NextRequest } from 'next/server'

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/models/Audio', () => ({
  default: { find: vi.fn(), create: vi.fn(), findById: vi.fn(), findByIdAndDelete: vi.fn() },
}))
vi.mock('@/lib/audio-upload', () => ({
  processarUpload: vi.fn(),
  UploadError: class UploadError extends Error {
    status: number
    constructor(m: string, s = 400) {
      super(m)
      this.status = s
    }
  },
}))
vi.mock('fs', () => ({ existsSync: vi.fn().mockReturnValue(false) }))
vi.mock('fs/promises', () => ({ unlink: vi.fn() }))

import { getServerSession } from 'next-auth/next'
import AudioModel from '@/models/Audio'
import { processarUpload, UploadError } from '@/lib/audio-upload'
import { GET, POST } from '@/app/api/audios/route'
import { DELETE } from '@/app/api/audios/[id]/route'

const session = vi.mocked(getServerSession)

beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue({ user: { email: 'a@b.c' } } as never)
})

/** monta um POST multipart com um File */
function uploadRequest(fields: Record<string, string | File>): NextRequest {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  return new NextRequest('http://localhost/api/audios', { method: 'POST', body: form })
}

describe('GET /api/audios', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('200 lista áudios não-temporários', async () => {
    ;(AudioModel.find as ReturnType<typeof vi.fn>).mockReturnValue(leanQuery([{ nome: 'a' }]))
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ nome: 'a' }])
  })
})

describe('POST /api/audios', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    const res = await POST(uploadRequest({ nome: 'x' }))
    expect(res.status).toBe(401)
  })

  it('400 sem arquivo', async () => {
    const res = await POST(uploadRequest({ nome: 'x' }))
    expect(res.status).toBe(400)
  })

  it('400 sem nome', async () => {
    const file = new File(['abc'], 'a.mp3', { type: 'audio/mpeg' })
    const res = await POST(uploadRequest({ arquivo: file }))
    expect(res.status).toBe(400)
  })

  it('400 quando processarUpload lança UploadError', async () => {
    ;(processarUpload as ReturnType<typeof vi.fn>).mockRejectedValue(new UploadError('Formato inválido'))
    const file = new File(['abc'], 'a.ogg', { type: 'audio/ogg' })
    const res = await POST(uploadRequest({ arquivo: file, nome: 'x' }))
    expect(res.status).toBe(400)
  })

  it('201 happy path persiste metadados', async () => {
    ;(processarUpload as ReturnType<typeof vi.fn>).mockResolvedValue({
      nomeArquivo: 'uuid.mp3',
      tamanho: 3,
      checksum: 'abc',
    })
    ;(AudioModel.create as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: '1', nome: 'x' })
    const file = new File(['abc'], 'a.mp3', { type: 'audio/mpeg' })
    const res = await POST(uploadRequest({ arquivo: file, nome: 'x' }))
    expect(res.status).toBe(201)
    expect(AudioModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'x', nomeArquivo: 'uuid.mp3', checksum: 'abc' })
    )
  })
})

describe('DELETE /api/audios/[id]', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    const res = await DELETE(simpleRequest('/api/audios/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(401)
  })

  it('404 quando o áudio não existe', async () => {
    ;(AudioModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const res = await DELETE(simpleRequest('/api/audios/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(404)
  })

  it('200 remove do banco', async () => {
    ;(AudioModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ nomeArquivo: 'x.mp3' })
    ;(AudioModel.findByIdAndDelete as ReturnType<typeof vi.fn>).mockResolvedValue({})
    const res = await DELETE(simpleRequest('/api/audios/1', 'DELETE'), ctx({ id: '1' }))
    expect(res.status).toBe(200)
    expect(AudioModel.findByIdAndDelete).toHaveBeenCalledWith('1')
  })
})
