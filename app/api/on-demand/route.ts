import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'
import { resolveNodes } from '@/lib/scheduleSync'
import { apiError, handleRoute, parseBody, requireSession } from '@/lib/api-utils'
import { onDemandSchema } from '@/lib/validators'
import { env } from '@/lib/env'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const POST = handleRoute(async (request: NextRequest) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const parsed = await parseBody(request, onDemandSchema)
  if (parsed.error) return parsed.error
  const { audioId, nosIds, gruposIds } = parsed.data

  await connectDB()

  const audio = await AudioModel.findById(audioId).lean()
  if (!audio) return apiError('Áudio não encontrado', 404)

  // Resolve target nodes (direct + via groups, de-duplicated)
  const nosUnicos = await resolveNodes(nosIds, gruposIds)

  // Always sync first — /sync on the firmware is synchronous, so this blocks
  // until each node has downloaded all pending files (including this audio).
  await Promise.allSettled(
    nosUnicos.map((no) =>
      fetch(`http://${no.ip}/sync`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
      }).catch(() => {})
    )
  )

  const resultados: { noId: string; ip: string; sucesso: boolean; erro?: string }[] = []

  await Promise.allSettled(
    nosUnicos.map(async (no) => {
      try {
        const resp = await fetch(`http://${no.ip}/play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arquivo: audio.nomeArquivo, tipo: 'on-demand' }),
          signal: AbortSignal.timeout(5000),
        })
        resultados.push({ noId: String(no._id), ip: no.ip, sucesso: resp.ok })
      } catch {
        resultados.push({ noId: String(no._id), ip: no.ip, sucesso: false, erro: 'Nó inacessível' })
      }
    })
  )

  // Recorded audio: clean up from DB and disk now that every node received /play.
  // The firmware's orphan-cleanup pass will delete the file from SD on the next sync.
  if (audio.temporario) {
    const filePath = path.join(env.UPLOAD_DIR, audio.nomeArquivo)
    if (existsSync(filePath)) await unlink(filePath).catch(() => {})
    await AudioModel.findByIdAndDelete(audioId)
  }

  return NextResponse.json({ resultados })
})
