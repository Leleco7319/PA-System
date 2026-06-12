import { writeFile, mkdir, readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { env } from '@/lib/env'

ffmpeg.setFfmpegPath(ffmpegStatic as string)

export const EXTENSOES_ACEITAS = ['mp3', 'wav', 'webm'] as const

/** Erro de validação de upload — vira resposta 400 nas rotas. */
export class UploadError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message)
    this.name = 'UploadError'
  }
}

export function extrairExtensao(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function validarExtensao(ext: string): boolean {
  return (EXTENSOES_ACEITAS as readonly string[]).includes(ext)
}

export function validarTamanho(bytes: number, maxMB: number): boolean {
  return bytes / (1024 * 1024) <= maxMB
}

/**
 * MD5 é contrato com o firmware ESP32 (verificação de integridade dos
 * arquivos baixados, não uso criptográfico) — não trocar de algoritmo.
 */
export function md5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

export function converterParaMp3(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .toFormat('mp3')
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath)
  })
}

export interface UploadResult {
  nomeArquivo: string
  tamanho: number
  checksum: string
}

/**
 * Valida, converte (webm→mp3) e grava o arquivo em UPLOAD_DIR.
 * `prefixoTmp` gera nome `tmp-{uuid}.{ext}` (áudios on-demand descartáveis).
 * Lança UploadError (400) para falhas de validação.
 */
export async function processarUpload(
  arquivo: File,
  opts: { prefixoTmp?: boolean } = {}
): Promise<UploadResult> {
  const ext = extrairExtensao(arquivo.name)
  if (!validarExtensao(ext)) {
    throw new UploadError('Formatos aceitos: .mp3, .wav, .webm')
  }
  if (!validarTamanho(arquivo.size, env.MAX_UPLOAD_SIZE_MB)) {
    throw new UploadError(`Arquivo excede ${env.MAX_UPLOAD_SIZE_MB} MB`)
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer())

  if (!existsSync(env.UPLOAD_DIR)) await mkdir(env.UPLOAD_DIR, { recursive: true })

  let finalBuffer = buffer
  let finalExt = ext

  if (ext === 'webm') {
    const tmpPath = path.join(env.UPLOAD_DIR, `tmp-${uuidv4()}.webm`)
    const mp3Path = path.join(env.UPLOAD_DIR, `tmp-${uuidv4()}.mp3`)
    try {
      await writeFile(tmpPath, buffer)
      await converterParaMp3(tmpPath, mp3Path)
      finalBuffer = await readFile(mp3Path)
      finalExt = 'mp3'
    } finally {
      await unlink(tmpPath).catch(() => {})
      await unlink(mp3Path).catch(() => {})
    }
  }

  const nomeArquivo = `${opts.prefixoTmp ? 'tmp-' : ''}${uuidv4()}.${finalExt}`
  await writeFile(path.join(env.UPLOAD_DIR, nomeArquivo), finalBuffer)

  return { nomeArquivo, tamanho: finalBuffer.length, checksum: md5(finalBuffer) }
}
