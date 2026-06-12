'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Spinner from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/utils'
import type { IAgendamentoJSON, AgendamentoStatus } from '@/types'

const statusColor: Record<AgendamentoStatus, 'yellow' | 'green' | 'red'> = {
  pendente: 'yellow',
  executado: 'green',
  falhou: 'red',
}

const statusLabel: Record<AgendamentoStatus, string> = {
  pendente: 'Pendente',
  executado: 'Executado',
  falhou: 'Falhou',
}

interface AgendamentoListProps {
  agendamentos: IAgendamentoJSON[]
  loading: boolean
  onDelete: (id: string) => Promise<void>
}

export default function AgendamentoList({ agendamentos, loading, onDelete }: AgendamentoListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    await onDelete(confirmId)
    setDeleting(false)
    setConfirmId(null)
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  if (agendamentos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>Nenhum agendamento cadastrado</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {agendamentos.map((ag) => {
          const audio = typeof ag.audio === 'object' ? ag.audio : null
          const nosCount = ag.nos.length
          const gruposCount = ag.grupos.length

          return (
            <div key={ag._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={statusColor[ag.status]} dot>
                    {statusLabel[ag.status]}
                  </Badge>
                  {ag.recorrente && <Badge color="blue">Recorrente</Badge>}
                </div>
                <p className="font-medium text-gray-900 truncate">
                  {audio && typeof audio === 'object' ? audio.nome : 'Áudio removido'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDateTime(ag.dataHora)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {nosCount > 0 && `${nosCount} nó${nosCount > 1 ? 's' : ''}`}
                  {nosCount > 0 && gruposCount > 0 && ' · '}
                  {gruposCount > 0 && `${gruposCount} grupo${gruposCount > 1 ? 's' : ''}`}
                </p>
                {ag.cron && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{ag.cron}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmId(ag._id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
              >
                Remover
              </Button>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={!!confirmId}
        title="Remover agendamento"
        message="Tem certeza que deseja remover este agendamento?"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </>
  )
}
