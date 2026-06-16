import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verificarNodeKey } from '@/lib/node-auth'
import { apiError, handleRoute } from '@/lib/api-utils'
import { env } from '@/lib/env'

export const GET = handleRoute(async (
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) => {
  if (!verificarNodeKey(request)) return apiError('Não autorizado', 401)

  const { filename } = await params

  // Previne path traversal
  const safeName = path.basename(filename)
  const filePath = path.join(env.UPLOAD_DIR, safeName)

  if (!existsSync(filePath)) return apiError('Arquivo não encontrado', 404)

  const buffer = await readFile(filePath)
  const ext = safeName.split('.').pop()?.toLowerCase()
  const contentTypeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
  }
  const contentType = contentTypeMap[ext ?? ''] ?? 'application/octet-stream'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(buffer.length),
    },
  })
})
