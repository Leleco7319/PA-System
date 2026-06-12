import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'
import { apiError, handleRoute, requireSession } from '@/lib/api-utils'
import { processarUpload, UploadError } from '@/lib/audio-upload'

export const POST = handleRoute(async (request: NextRequest) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return apiError('Arquivo não enviado', 400)

  try {
    const { nomeArquivo, tamanho, checksum } = await processarUpload(arquivo, { prefixoTmp: true })

    // Save to DB as temporario — invisible in the library, deleted right after play
    await connectDB()
    const audio = await AudioModel.create({
      nome: `on-demand-${Date.now()}`,
      nomeArquivo,
      tamanho,
      checksum,
      temporario: true,
    })

    return NextResponse.json({ audioId: String(audio._id) }, { status: 201 })
  } catch (err) {
    if (err instanceof UploadError) return apiError(err.message, err.status)
    throw err
  }
})
