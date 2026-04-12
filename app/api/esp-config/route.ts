import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import dgram from 'dgram'

export const runtime = 'nodejs'

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false
  return ip.split('.').every((octet) => parseInt(octet, 10) <= 255)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const { ip, port, wifiSSID, wifiPassword, hostname, volume, mqttBroker, mqttPort, apiToken } = body

  if (!ip || !isValidIp(ip)) {
    return NextResponse.json({ error: 'IP inválido' }, { status: 400 })
  }

  const portNum = parseInt(port, 10)
  if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json({ error: 'Porta inválida (1–65535)' }, { status: 400 })
  }

  const payload = JSON.stringify({
    wifiSSID,
    wifiPassword,
    hostname,
    volume: Number(volume),
    mqttBroker,
    mqttPort: Number(mqttPort),
    apiToken,
  })

  const buffer = Buffer.from(payload, 'utf8')

  await new Promise<void>((resolve, reject) => {
    const client = dgram.createSocket('udp4')
    client.send(buffer, 0, buffer.length, portNum, ip, (err) => {
      client.close()
      if (err) reject(err)
      else resolve()
    })
  })

  return NextResponse.json({
    success: true,
    sentTo: `${ip}:${portNum}`,
    bytes: buffer.length,
  })
}
