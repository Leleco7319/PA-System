import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import { verificarNodeKey } from '@/lib/node-auth'
import { apiError, handleRoute, parseBody } from '@/lib/api-utils'
import { nodeStatusSchema } from '@/lib/validators'

export const POST = handleRoute(async (request: NextRequest) => {
  if (!verificarNodeKey(request)) return apiError('Não autorizado', 401)

  const parsed = await parseBody(request, nodeStatusSchema)
  if (parsed.error) return parsed.error
  const { macAddress, filename, status, message } = parsed.data

  await connectDB()
  const no = await NoModel.findOne({ macAddress })
  if (!no) return apiError('Nó não registrado', 404)

  // Log apenas — expansão futura pode gravar histórico de reprodução
  console.log(`[status] Nó ${macAddress} | ${filename} | ${status}${message ? ` | ${message}` : ''}`)

  return NextResponse.json({ success: true })
})
