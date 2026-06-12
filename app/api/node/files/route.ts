import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'
import { verificarNodeKey } from '@/lib/node-auth'
import { apiError, handleRoute } from '@/lib/api-utils'

export const GET = handleRoute(async (request: NextRequest) => {
  if (!verificarNodeKey(request)) return apiError('Não autorizado', 401)

  await connectDB()
  const audios = await AudioModel.find({}, 'nomeArquivo checksum tamanho').lean()

  const files = audios.map((a) => ({
    filename: a.nomeArquivo,
    checksum: a.checksum,
    size: a.tamanho,
  }))

  return NextResponse.json({ files })
})
