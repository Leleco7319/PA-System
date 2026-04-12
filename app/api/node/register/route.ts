import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import type { NodeRegisterPayload } from '@/types'

function verificarNodeKey(request: NextRequest): boolean {
  return request.headers.get('x-node-key') === process.env.NODE_API_KEY
}

export async function POST(request: NextRequest) {
  if (!verificarNodeKey(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body: NodeRegisterPayload = await request.json()
  const { macAddress, ip, versaoFirmware, nome } = body

  if (!macAddress || !ip) {
    return NextResponse.json({ error: 'macAddress e ip são obrigatórios' }, { status: 400 })
  }

  await connectDB()
  const no = await NoModel.findOneAndUpdate(
    { macAddress },
    {
      ip,
      versaoFirmware: versaoFirmware ?? '',
      nome: nome ?? macAddress,
      online: true,
      ultimoHeartbeat: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return NextResponse.json({ success: true, noId: String(no._id) }, { status: 200 })
}
