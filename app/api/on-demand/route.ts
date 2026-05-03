import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import GrupoModel from '@/models/Grupo'
import AudioModel from '@/models/Audio'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { audioId, nosIds = [], gruposIds = [] } = body as {
    audioId: string
    nosIds: string[]
    gruposIds: string[]
  }

  if (!audioId) return NextResponse.json({ error: 'audioId obrigatório' }, { status: 400 })
  if (nosIds.length === 0 && gruposIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos um nó ou grupo' }, { status: 400 })
  }

  await connectDB()

  const audio = await AudioModel.findById(audioId).lean()
  if (!audio) return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })

  // Resolve target nodes (direct + via groups)
  const nosDirectos = await NoModel.find({ _id: { $in: nosIds } }).lean()
  const grupos = await GrupoModel.find({ _id: { $in: gruposIds } }).populate('nos').lean()
  const nosViaGrupos = grupos.flatMap((g) => g.nos as typeof nosDirectos)
  const nosUnicos = Array.from(
    new Map([...nosDirectos, ...nosViaGrupos].map((n) => [String(n._id), n])).values()
  )

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
    const filePath = path.join(process.cwd(), 'public', 'uploads', audio.nomeArquivo)
    if (existsSync(filePath)) await unlink(filePath).catch(() => {})
    await AudioModel.findByIdAndDelete(audioId)
  }

  return NextResponse.json({ resultados })
}
