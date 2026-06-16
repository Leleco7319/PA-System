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

// Tempo que um áudio temporário sobrevive antes da varredura removê-lo.
// Folga generosa para o ESP baixar (/api/node/download) e reproduzir o arquivo
// — apagá-lo imediatamente após o /play causava 404 no download assíncrono do nó.
const TMP_AUDIO_TTL_MS = 10 * 60 * 1000

/** Remove do disco e do DB os áudios temporários já expirados (criados há mais de TTL). */
async function limparTemporariosExpirados() {
  const limite = new Date(Date.now() - TMP_AUDIO_TTL_MS)
  const expirados = await AudioModel.find({
    temporario: true,
    createdAt: { $lt: limite },
  }).lean()

  if (expirados.length === 0) return

  await Promise.all(
    expirados.map((a) => {
      const filePath = path.join(env.UPLOAD_DIR, a.nomeArquivo)
      return existsSync(filePath) ? unlink(filePath).catch(() => {}) : Promise.resolve()
    })
  )
  await AudioModel.deleteMany({ _id: { $in: expirados.map((a) => a._id) } })
}

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
          body: JSON.stringify({ filename: audio.nomeArquivo, tipo: 'on-demand' }),
          signal: AbortSignal.timeout(5000),
        })
        resultados.push({ noId: String(no._id), ip: no.ip, sucesso: resp.ok })
      } catch {
        resultados.push({ noId: String(no._id), ip: no.ip, sucesso: false, erro: 'Nó inacessível' })
      }
    })
  )

  // NÃO apagamos o áudio temporário recém-tocado aqui: o ESP baixa o arquivo de
  // forma assíncrona (durante/após o /sync), então removê-lo agora causaria 404 em
  // /api/node/download. A varredura abaixo limpa apenas os temporários já expirados
  // (criados há mais de TMP_AUDIO_TTL_MS) — tempo de sobra para baixar e reproduzir.
  // Sem o doc no DB, o /api/node/files deixa de listá-lo e o ESP o remove do SD no
  // próximo sync (orphan-cleanup do firmware).
  await limparTemporariosExpirados()

  return NextResponse.json({ resultados })
})
