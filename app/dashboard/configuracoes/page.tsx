'use client'

import { signOut, useSession } from 'next-auth/react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'

export default function ConfiguracoesPage() {
  const { data: session } = useSession()

  return (
    <div>
      <Header title="Configurações" />
      <div className="p-6 max-w-2xl space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Conta</h2>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Nome:</span> <span className="text-gray-900">{session?.user?.name}</span></p>
            <p><span className="text-gray-500">E-mail:</span> <span className="text-gray-900">{session?.user?.email}</span></p>
          </div>
          <Button
            variant="danger"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sair do sistema
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Integração ESP32</h2>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm font-mono">
            <p className="text-gray-500"># Registrar nó</p>
            <p className="text-gray-800 break-all">POST /api/node/register</p>
            <p className="text-gray-500"># Heartbeat</p>
            <p className="text-gray-800 break-all">POST /api/node/heartbeat</p>
            <p className="text-gray-500"># Buscar arquivos</p>
            <p className="text-gray-800 break-all">GET /api/node/files</p>
            <p className="text-gray-500"># Download</p>
            <p className="text-gray-800 break-all">GET /api/node/download/[filename]</p>
          </div>
          <p className="text-xs text-gray-400">
            Autenticação: Header <code className="bg-gray-100 px-1 py-0.5 rounded">x-node-key: &lt;NODE_API_KEY&gt;</code>
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Informações do Sistema</h2>
          <div className="text-sm space-y-1 text-gray-500">
            <p>Versão: <span className="text-gray-900">1.0.0</span></p>
            <p>Stack: <span className="text-gray-900">Next.js · MongoDB · NextAuth · Tailwind CSS</span></p>
            <p>Heartbeat timeout: <span className="text-gray-900">90 segundos</span></p>
            <p>Polling dashboard: <span className="text-gray-900">10 segundos</span></p>
            <p>Upload máximo: <span className="text-gray-900">{process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? '50'} MB</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
