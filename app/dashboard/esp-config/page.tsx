'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface EspConfig {
  ip: string
  port: string
  wifiSSID: string
  wifiPassword: string
  hostname: string
  volume: string
  ServerURL: string
  apiToken: string
}

const DEFAULT_CONFIG: EspConfig = {
  ip: '',
  port: '8000',
  wifiSSID: '',
  wifiPassword: '',
  hostname: '',
  volume: '10',
  ServerURL: '',
  apiToken: '',
}

export default function EspConfigPage() {
  const [config, setConfig] = useState<EspConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  function handleChange(field: keyof EspConfig) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }))
      setResult(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const payload = Object.entries(config).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value
          return acc
        },
        {} as Record<string, string>
      )

      const res = await fetch('/api/esp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error ?? 'Erro desconhecido' })
      } else {
        setResult({
          success: true,
          message: `Pacote enviado para ${data.sentTo} (${data.bytes} bytes)`,
        })
      }
    } catch {
      setResult({ success: false, message: 'Falha na requisição' })
    } finally {
      setLoading(false)
    }
  }

  const previewFields: Record<string, string | number> = {
    wifiSSID: config.wifiSSID,
    wifiPassword: config.wifiPassword,
    hostname: config.hostname,
    volume: config.volume,
    ServerURL: config.ServerURL,
    apiToken: config.apiToken,
  }
  const previewPayload = JSON.stringify(
    Object.fromEntries(
      Object.entries(previewFields)
        .filter(([, value]) => value !== '')
        .map(([key, value]) => [key, key === 'volume' ? Number(value) : value])
    ),
    null,
    2
  )

  return (
    <div>
      <Header title="Configurar ESP32 via UDP" />
      <div className="p-6 max-w-2xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Destino */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Destino</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="IP do ESP32"
                placeholder="192.168.1.x"
                value={config.ip}
                onChange={handleChange('ip')}
                required
              />
              <Input
                label="Porta UDP"
                type="number"
                min={1}
                max={65535}
                value={config.port}
                onChange={handleChange('port')}
                required
              />
            </div>
          </div>

          {/* Wi-Fi */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Wi-Fi</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SSID"
                placeholder="Nome da rede Wi-Fi"
                value={config.wifiSSID}
                onChange={handleChange('wifiSSID')}
              />
              <Input
                label="Senha"
                type="password"
                placeholder="Senha da rede Wi-Fi"
                value={config.wifiPassword}
                onChange={handleChange('wifiPassword')}
              />
            </div>
          </div>

          {/* Dispositivo */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Dispositivo</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Hostname"
                placeholder="alarm-1"
                value={config.hostname}
                onChange={handleChange('hostname')}
              />
              <Input
                label="Volume (0–100)"
                type="number"
                min={0}
                max={100}
                value={config.volume}
                onChange={handleChange('volume')}
              />
            </div>
          </div>

          {/* Server URL */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Server URL</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Server URL"
                placeholder="http://192.168.1.x:3000"
                value={config.ServerURL}
                onChange={handleChange('ServerURL')}
              />
            </div>
          </div>

          {/* API Token */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Autenticação</h2>
            <Input
              label="API Token"
              type="password"
              placeholder="Token de autenticação do nó"
              value={config.apiToken}
              onChange={handleChange('apiToken')}
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2">
            <h2 className="font-semibold text-gray-700 text-sm">Preview do pacote UDP</h2>
            <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">
              {previewPayload}
            </pre>
          </div>

          {result && (
            <div
              className={[
                'rounded-lg px-4 py-3 text-sm font-medium',
                result.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200',
              ].join(' ')}
            >
              {result.message}
            </div>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            Enviar pacote UDP
          </Button>
        </form>
      </div>
    </div>
  )
}
