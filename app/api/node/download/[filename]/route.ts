import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

function verificarNodeKey(request: NextRequest): boolean {
  return request.headers.get('x-node-key') === process.env.NODE_API_KEY
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  if (!verificarNodeKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { filename } = await params

  // Previne path traversal
  const safeName = path.basename(filename)
  const filePath = path.join(process.cwd(), 'public', 'uploads', safeName)

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }

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
}
