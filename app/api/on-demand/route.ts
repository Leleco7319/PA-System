import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import GrupoModel from '@/models/Grupo'
import AudioModel from '@/models/Audio'
import type { OnDemandPayload } from '@/types'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body: OnDemandPayload = await request.json()
  const { audioId, nosIds = [], gruposIds = [] } = body

  if (!audioId) return NextResponse.json({ error: 'audioId obrigatório' }, { status: 400 })
  if (nosIds.length === 0 && gruposIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos um nó ou grupo' }, { status: 400 })
  }

  await connectDB()

  const audio = await AudioModel.findById(audioId).lean()
  if (!audio) return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })

  // Resolve todos os nós alvo (diretos + via grupos)
  const nosDirectos = await NoModel.find({ _id: { $in: nosIds } }).lean()
  const grupos = await GrupoModel.find({ _id: { $in: gruposIds } }).populate('nos').lean()
  const nosViaGrupos = grupos.flatMap((g) => g.nos as typeof nosDirectos)

  const todosNos = [...nosDirectos, ...nosViaGrupos]
  const nosUnicos = Array.from(new Map(todosNos.map((n) => [String(n._id), n])).values())

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
      } catch (err) {
        resultados.push({
          noId: String(no._id),
          ip: no.ip,
          sucesso: false,
          erro: 'Nó inacessível',
        })
      }
    })
  )

  return NextResponse.json({ resultados })
}
