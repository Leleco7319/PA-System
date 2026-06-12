import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { verificarNodeKey } from '@/lib/node-auth'
import { apiError, handleRoute, parseBody } from '@/lib/api-utils'
import { nodeHeartbeatSchema } from '@/lib/validators'

export const POST = handleRoute(async (request: NextRequest) => {
  if (!verificarNodeKey(request)) return apiError('Não autorizado', 401)

  const parsed = await parseBody(request, nodeHeartbeatSchema)
  if (parsed.error) return parsed.error
  const { macAddress, ip } = parsed.data

  await connectDB()
  const update: { online: boolean; ultimoHeartbeat: Date; ip?: string } = {
    online: true,
    ultimoHeartbeat: new Date(),
  }
  if (ip) update.ip = ip

  const no = await NoModel.findOneAndUpdate({ macAddress }, update, { new: true })
  if (!no) return apiError('Nó não registrado', 404)

  return NextResponse.json({ success: true })
})
