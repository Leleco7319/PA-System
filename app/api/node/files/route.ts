import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'

function verificarNodeKey(request: NextRequest): boolean {
  return request.headers.get('x-node-key') === process.env.NODE_API_KEY
}

export async function GET(request: NextRequest) {
  if (!verificarNodeKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  await connectDB()
  const audios = await AudioModel.find({}, 'nomeArquivo checksum tamanho').lean()

  const files = audios.map((a) => ({
    filename: a.nomeArquivo,
    checksum: a.checksum,
    size: a.tamanho,
  }))

  return NextResponse.json({ files })
}
