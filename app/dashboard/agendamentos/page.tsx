'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import AgendamentoList from '@/components/agendamentos/AgendamentoList'
import AgendamentoForm from '@/components/agendamentos/AgendamentoForm'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { IAgendamentoJSON } from '@/types'

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<IAgendamentoJSON[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAgendamentos = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/agendamentos')
    const data = await res.json()
    setAgendamentos(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAgendamentos() }, [fetchAgendamentos])

  async function handleDelete(id: string) {
    await fetch(`/api/agendamentos/${id}`, { method: 'DELETE' })
    await fetchAgendamentos()
  }

  return (
    <div>
      <Header title="Agendamentos" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{agendamentos.length} agendamento{agendamentos.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setModalOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Agendamento
          </Button>
        </div>

        <AgendamentoList agendamentos={agendamentos} loading={loading} onDelete={handleDelete} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Agendamento">
        <AgendamentoForm
          onSuccess={() => {
            setModalOpen(false)
            fetchAgendamentos()
          }}
        />
      </Modal>
    </div>
  )
}
