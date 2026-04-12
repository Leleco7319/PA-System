'use client'

import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import type { INoJSON } from '@/types'

interface NoCardProps {
  no: INoJSON
  onDelete: (id: string) => void
  onSincronizar: (id: string) => void
  sincronizando: boolean
}

export default function NoCard({ no, onDelete, onSincronizar, sincronizando }: NoCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-gray-900">{no.nome}</p>
            <Badge color={no.online ? 'green' : 'red'} dot>
              {no.online ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 font-mono">{no.ip}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
          onClick={() => onDelete(no._id)}
        >
          Remover
        </Button>
      </div>

      <div className="text-xs text-gray-400 space-y-0.5">
        <p>MAC: <span className="font-mono">{no.macAddress}</span></p>
        <p>Firmware: <span className="font-mono">{no.versaoFirmware || '—'}</span></p>
        <p>Último heartbeat: {formatDateTime(no.ultimoHeartbeat)}</p>
      </div>

      {(no.grupos as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(no.grupos as string[]).map((g, i) => (
            <Badge key={i} color="blue">{typeof g === 'object' ? (g as { nome: string }).nome : g}</Badge>
          ))}
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        loading={sincronizando}
        onClick={() => onSincronizar(no._id)}
        className="w-full"
      >
        Sincronizar
      </Button>
    </div>
  )
}
