import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { verificarNodeKey } from '@/lib/node-auth'
import { apiError, handleRoute, parseBody } from '@/lib/api-utils'
import { nodeRegisterSchema } from '@/lib/validators'

export const POST = handleRoute(async (request: NextRequest) => {
  if (!verificarNodeKey(request)) return apiError('Não autorizado', 401)

  const parsed = await parseBody(request, nodeRegisterSchema)
  if (parsed.error) return parsed.error
  const { macAddress, ip, firmwareVersion, name } = parsed.data

  await connectDB()
  const no = await NoModel.findOneAndUpdate(
    { macAddress },
    {
      ip,
      versaoFirmware: firmwareVersion ?? '',
      nome: name ?? macAddress,
      online: true,
      ultimoHeartbeat: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return NextResponse.json({ success: true, noId: String(no._id) }, { status: 200 })
})
