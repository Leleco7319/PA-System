import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'
import { apiError, handleRoute, requireSession } from '@/lib/api-utils'
import { env } from '@/lib/env'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const DELETE = handleRoute(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const { id } = await params
  await connectDB()
  const audio = await AudioModel.findById(id)
  if (!audio) return apiError('Áudio não encontrado', 404)

  const filePath = path.join(env.UPLOAD_DIR, audio.nomeArquivo)
  if (existsSync(filePath)) await unlink(filePath)

  await AudioModel.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
})
