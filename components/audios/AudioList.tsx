'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Spinner from '@/components/ui/Spinner'
import { formatBytes, formatDuration } from '@/lib/utils'
import type { IAudioJSON } from '@/types'

interface AudioListProps {
  audios: IAudioJSON[]
  loading: boolean
  onDelete: (id: string) => Promise<void>
}

export default function AudioList({ audios, loading, onDelete }: AudioListProps) {
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

  if (audios.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <p>Nenhum áudio cadastrado</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Arquivo</th>
              <th className="px-4 py-3 text-left">Tamanho</th>
              <th className="px-4 py-3 text-left">Duração</th>
              <th className="px-4 py-3 text-left">MD5</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {audios.map((audio) => (
              <tr key={audio._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{audio.nome}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{audio.nomeArquivo}</td>
                <td className="px-4 py-3 text-gray-500">{formatBytes(audio.tamanho)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDuration(audio.duracao ?? 0)}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{audio.checksum.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmId(audio._id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Remover
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!confirmId}
        title="Remover áudio"
        message="Tem certeza que deseja remover este áudio? O arquivo será excluído permanentemente."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </>
  )
}
