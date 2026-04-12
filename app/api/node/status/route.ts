import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import type { NodeStatusPayload } from '@/types'

function verificarNodeKey(request: NextRequest): boolean {
  return request.headers.get('x-node-key') === process.env.NODE_API_KEY
}

export async function POST(request: NextRequest) {
  if (!verificarNodeKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body: NodeStatusPayload = await request.json()
  const { macAddress, arquivo, status, mensagem } = body

  if (!macAddress || !arquivo || !status) {
    return NextResponse.json({ error: 'macAddress, arquivo e status são obrigatórios' }, { status: 400 })
  }

  await connectDB()
  const no = await NoModel.findOne({ macAddress })
  if (!no) return NextResponse.json({ error: 'Nó não registrado' }, { status: 404 })

  // Log apenas — expansão futura pode gravar histórico de reprodução
  console.log(`[status] Nó ${macAddress} | ${arquivo} | ${status}${mensagem ? ` | ${mensagem}` : ''}`)

  return NextResponse.json({ success: true })
}
