import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { jsonRequest } from './helpers'
import { NextRequest } from 'next/server'

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/models/Audio', () => ({
  default: { findById: vi.fn(), find: vi.fn(), create: vi.fn(), findByIdAndDelete: vi.fn(), deleteMany: vi.fn() },
}))
vi.mock('@/lib/scheduleSync', () => ({ resolveNodes: vi.fn() }))
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
import { resolveNodes } from '@/lib/scheduleSync'
import { processarUpload } from '@/lib/audio-upload'
import { POST as onDemandPOST } from '@/app/api/on-demand/route'
import { POST as uploadPOST } from '@/app/api/on-demand/upload/route'

const session = vi.mocked(getServerSession)
const OID = '507f1f77bcf86cd799439011'
const OID2 = '507f1f77bcf86cd799439012'

beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue({ user: {} } as never)
  // Default da varredura de temporários: nada expirado (testes sobrescrevem quando preciso)
  ;(AudioModel.find as ReturnType<typeof vi.fn>).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
})
afterEach(() => vi.unstubAllGlobals())

describe('POST /api/on-demand', () => {
  it('401 sem sessão', async () => {
    session.mockResolvedValue(null)
    const res = await onDemandPOST(jsonRequest('/api/on-demand', 'POST', { audioId: OID, nosIds: [OID2] }))
    expect(res.status).toBe(401)
  })

  it('400 sem destino', async () => {
    const res = await onDemandPOST(jsonRequest('/api/on-demand', 'POST', { audioId: OID }))
    expect(res.status).toBe(400)
  })

  it('404 quando o áudio não existe', async () => {
    ;(AudioModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
    const res = await onDemandPOST(jsonRequest('/api/on-demand', 'POST', { audioId: OID, nosIds: [OID2] }))
    expect(res.status).toBe(404)
  })

  it('200 dispara /sync e /play nos nós resolvidos', async () => {
    ;(AudioModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: OID, nomeArquivo: 'a.mp3', temporario: false }),
    })
    ;(resolveNodes as ReturnType<typeof vi.fn>).mockResolvedValue([{ _id: 'n1', ip: '1.1.1.1' }])
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const res = await onDemandPOST(jsonRequest('/api/on-demand', 'POST', { audioId: OID, nosIds: [OID2] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.resultados[0].sucesso).toBe(true)
    // /sync + /play
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('NÃO apaga o áudio temporário recém-reproduzido (evita 404 no download do ESP)', async () => {
    ;(AudioModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: OID, nomeArquivo: 'tmp.mp3', temporario: true }),
    })
    // varredura: nenhum temporário expirado
    ;(AudioModel.find as ReturnType<typeof vi.fn>).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    ;(resolveNodes as ReturnType<typeof vi.fn>).mockResolvedValue([{ _id: 'n1', ip: '1.1.1.1' }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    await onDemandPOST(jsonRequest('/api/on-demand', 'POST', { audioId: OID, nosIds: [OID2] }))
    expect(AudioModel.findByIdAndDelete).not.toHaveBeenCalled()
    expect(AudioModel.deleteMany).not.toHaveBeenCalled()
  })

  it('varre temporários expirados (disco + DB) após reproduzir', async () => {
    ;(AudioModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: OID, nomeArquivo: 'a.mp3', temporario: false }),
    })
    ;(AudioModel.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'velho1', nomeArquivo: 'tmp-velho.mp3' }]),
    })
    ;(AudioModel.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(resolveNodes as ReturnType<typeof vi.fn>).mockResolvedValue([{ _id: 'n1', ip: '1.1.1.1' }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    await onDemandPOST(jsonRequest('/api/on-demand', 'POST', { audioId: OID, nosIds: [OID2] }))
    expect(AudioModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['velho1'] } })
  })
})

function uploadRequest(file?: File): NextRequest {
  const form = new FormData()
  if (file) form.append('arquivo', file)
  return new NextRequest('http://localhost/api/on-demand/upload', { method: 'POST', body: form })
}

describe('POST /api/on-demand/upload', () => {
  it('400 sem arquivo', async () => {
    const res = await uploadPOST(uploadRequest())
    expect(res.status).toBe(400)
  })

  it('201 retorna audioId do áudio temporário', async () => {
    ;(processarUpload as ReturnType<typeof vi.fn>).mockResolvedValue({
      nomeArquivo: 'tmp-uuid.mp3',
      tamanho: 3,
      checksum: 'abc',
    })
    ;(AudioModel.create as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'aud1' })
    const file = new File(['abc'], 'rec.webm', { type: 'audio/webm' })
    const res = await uploadPOST(uploadRequest(file))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ audioId: 'aud1' })
    // FormData recria o File, então validamos só as opções (prefixoTmp + formato wav)
    expect(processarUpload).toHaveBeenCalledWith(expect.any(File), { prefixoTmp: true, formato: 'wav' })
  })
})
