import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { isNodeOnline } from '@/lib/utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const nos = await NoModel.find().populate('grupos', 'nome').sort({ nome: 1 }).lean()

  // Atualiza status online em tempo real baseado no ultimoHeartbeat
  const nosComStatus = nos.map((no) => ({
    ...no,
    online: isNodeOnline(no.ultimoHeartbeat),
  }))

  return NextResponse.json(nosComStatus)
}
