import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import type { NodeHeartbeatPayload } from '@/types'

function verificarNodeKey(request: NextRequest): boolean {
  return request.headers.get('x-node-key') === process.env.NODE_API_KEY
}

export async function POST(request: NextRequest) {
  if (!verificarNodeKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body: NodeHeartbeatPayload = await request.json()
  const { macAddress, ip } = body

  if (!macAddress) {
    return NextResponse.json({ error: 'macAddress obrigatório' }, { status: 400 })
  }

  await connectDB()
  const update: Record<string, unknown> = { online: true, ultimoHeartbeat: new Date() }
  if (ip) update.ip = ip

  const no = await NoModel.findOneAndUpdate({ macAddress }, update, { new: true })
  if (!no) return NextResponse.json({ error: 'Nó não registrado' }, { status: 404 })

  return NextResponse.json({ success: true })
}
