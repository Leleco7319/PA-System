import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { isNodeOnline } from '@/lib/utils'
import { apiError, handleRoute, requireSession } from '@/lib/api-utils'

export const GET = handleRoute(async () => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  await connectDB()
  const nos = await NoModel.find().populate('grupos', 'nome').sort({ nome: 1 }).lean()

  // Atualiza status online em tempo real baseado no ultimoHeartbeat
  const nosComStatus = nos.map((no) => ({
    ...no,
    online: isNodeOnline(no.ultimoHeartbeat),
  }))

  return NextResponse.json(nosComStatus)
})
