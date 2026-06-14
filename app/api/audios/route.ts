import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'
import { apiError, handleRoute, requireSession } from '@/lib/api-utils'
import { processarUpload, UploadError } from '@/lib/audio-upload'

export const GET = handleRoute(async () => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  await connectDB()
  const audios = await AudioModel.find({ temporario: { $ne: true } }).sort({ createdAt: -1 }).lean()
  return NextResponse.json(audios)
})

export const POST = handleRoute(async (request: NextRequest) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  const nome = formData.get('nome') as string | null
  const temporario = formData.get('temporario') === 'true'

  if (!arquivo) return apiError('Arquivo não enviado', 400)
  if (!nome?.trim()) return apiError('Nome obrigatório', 400)

  try {
    // Todo áudio é gravado em WAV: o ESP32 sem PSRAM não toca MP3 (falta RAM
    // contígua p/ o decoder), mas reproduz WAV PCM com pouquíssima memória.
    const { nomeArquivo, tamanho, checksum } = await processarUpload(arquivo, { formato: 'wav' })

    await connectDB()
    const audio = await AudioModel.create({
      nome: nome.trim(),
      nomeArquivo,
      tamanho,
      checksum,
      temporario,
    })

    return NextResponse.json(audio, { status: 201 })
  } catch (err) {
    if (err instanceof UploadError) return apiError(err.message, err.status)
    throw err
  }
})
