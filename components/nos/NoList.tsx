'use client'

import { useState } from 'react'
import NoCard from './NoCard'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { INoJSON } from '@/types'

interface NoListProps {
  nos: INoJSON[]
  loading: boolean
  onDelete: (id: string) => Promise<void>
  onSincronizar: (id: string) => Promise<void>
}

export default function NoList({ nos, loading, onDelete, onSincronizar }: NoListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sincronizandoId, setSincronizandoId] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    await onDelete(confirmId)
    setDeleting(false)
    setConfirmId(null)
  }

  async function handleSincronizar(id: string) {
    setSincronizandoId(id)
    await onSincronizar(id)
    setSincronizandoId(null)
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  if (nos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
        <p>Nenhum nó registrado</p>
        <p className="text-sm mt-1">Os ESP32 aparecem aqui após o primeiro heartbeat</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {nos.map((no) => (
          <NoCard
            key={no._id}
            no={no}
            onDelete={() => setConfirmId(no._id)}
            onSincronizar={handleSincronizar}
            sincronizando={sincronizandoId === no._id}
          />
        ))}
      </div>

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Remover nó"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Remover</Button>
          </>
        }
      >
        <p className="text-gray-600">Tem certeza que deseja remover este nó?</p>
      </Modal>
    </>
  )
}
