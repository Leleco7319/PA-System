import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'
import { writeFile, mkdir, readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'

ffmpeg.setFfmpegPath(ffmpegStatic as string)

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

function converterParaMp3(inputPath: string, outputPath: string): Promise<void> {
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

  const ext = arquivo.name.split('.').pop()?.toLowerCase()
  if (!['mp3', 'wav', 'webm'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Formatos aceitos: .mp3, .wav, .webm' }, { status: 400 })
  }

  try {
    const bytes = await arquivo.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })

    let finalBuffer = buffer
    let finalExt = ext as string

    if (ext === 'webm') {
      const tmpPath = path.join(UPLOAD_DIR, `tmp-${uuidv4()}.webm`)
      const mp3Path = path.join(UPLOAD_DIR, `tmp-${uuidv4()}.mp3`)
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

    const checksum = crypto.createHash('md5').update(finalBuffer).digest('hex')
    const nomeArquivo = `tmp-${uuidv4()}.${finalExt}`
    await writeFile(path.join(UPLOAD_DIR, nomeArquivo), finalBuffer)

    // Save to DB as temporario — invisible in the library, deleted right after play
    await connectDB()
    const audio = await AudioModel.create({
      nome: `on-demand-${Date.now()}`,
      nomeArquivo,
      tamanho: finalBuffer.length,
      checksum,
      temporario: true,
    })

    return NextResponse.json({ audioId: String(audio._id) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
