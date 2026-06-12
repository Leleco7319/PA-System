'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Badge from '@/components/ui/Badge'
import type { IGrupoJSON, INoJSON } from '@/types'

interface GrupoManagerProps {
  grupos: IGrupoJSON[]
  nos: INoJSON[]
  onRefresh: () => void
}

export default function GrupoManager({ grupos, nos, onRefresh }: GrupoManagerProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<IGrupoJSON | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [nosIds, setNosIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function abrirCriar() {
    setEditando(null)
    setNome('')
    setDescricao('')
    setNosIds([])
    setError('')
    setModalOpen(true)
  }

  function abrirEditar(grupo: IGrupoJSON) {
    setEditando(grupo)
    setNome(grupo.nome)
    setDescricao(grupo.descricao)
    setNosIds((grupo.nos as string[]).map((n) => (typeof n === 'object' ? (n as { _id: string })._id : n)))
    setError('')
    setModalOpen(true)
  }

  function toggleNo(id: string) {
    setNosIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleSalvar() {
    if (!nome.trim()) { setError('Nome obrigatório'); return }
    setLoading(true)
    setError('')

    try {
      const url = editando ? `/api/grupos/${editando._id}` : '/api/grupos'
      const method = editando ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), descricao, nosIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
      setModalOpen(false)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletar() {
    if (!confirmId) return
    setDeleting(true)
    await fetch(`/api/grupos/${confirmId}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmId(null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Grupos</h3>
        <Button size="sm" onClick={abrirCriar}>Novo Grupo</Button>
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Nenhum grupo criado</p>
      ) : (
        <div className="space-y-2">
          {grupos.map((g) => (
            <div key={g._id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm text-gray-900">{g.nome}</p>
                {g.descricao && <p className="text-xs text-gray-400">{g.descricao}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{g.nos.length} nó{g.nos.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => abrirEditar(g)}>Editar</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setConfirmId(g._id)}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Grupo' : 'Novo Grupo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} loading={loading}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nome do grupo" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input label="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

          {nos.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nós</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {nos.map((no) => (
                  <label key={no._id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nosIds.includes(no._id)}
                      onChange={() => toggleNo(no._id)}
                      className="rounded"
                    />
                    <span className={no.online ? 'text-gray-900' : 'text-gray-400'}>{no.nome}</span>
                    <Badge color={no.online ? 'green' : 'gray'} dot>{no.online ? 'On' : 'Off'}</Badge>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmId}
        title="Remover grupo"
        message="Tem certeza que deseja remover este grupo?"
        loading={deleting}
        onConfirm={handleDeletar}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
