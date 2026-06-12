import { NextRequest, NextResponse } from 'next/server'
import dgram from 'dgram'
import { apiError, handleRoute, parseBody, requireSession } from '@/lib/api-utils'
import { espConfigSchema } from '@/lib/validators'

export const runtime = 'nodejs'

export const POST = handleRoute(async (request: NextRequest) => {
  const session = await requireSession()
  if (!session) return apiError('Não autorizado', 401)

  const parsed = await parseBody(request, espConfigSchema)
  if (parsed.error) return parsed.error
  const { ip, port, wifiSSID, wifiPassword, hostname, volume, mqttBroker, mqttPort, apiToken } = parsed.data

  const payload = JSON.stringify({
    wifiSSID,
    wifiPassword,
    hostname,
    volume,
    mqttBroker,
    mqttPort,
    apiToken,
  })

  const buffer = Buffer.from(payload, 'utf8')

  await new Promise<void>((resolve, reject) => {
    const client = dgram.createSocket('udp4')
    client.send(buffer, 0, buffer.length, port, ip, (err) => {
      client.close()
      if (err) reject(err)
      else resolve()
    })
  })

  return NextResponse.json({
    success: true,
    sentTo: `${ip}:${port}`,
    bytes: buffer.length,
  })
})
