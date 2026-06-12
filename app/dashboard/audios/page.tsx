'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import AudioUploadForm from '@/components/audios/AudioUploadForm'
import AudioList from '@/components/audios/AudioList'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import useApiList from '@/hooks/useApiList'
import type { IAudioJSON } from '@/types'

export default function AudiosPage() {
  const { data: audios, loading, error, refetch } = useApiList<IAudioJSON>('/api/audios')
  const [uploadOpen, setUploadOpen] = useState(false)

  async function handleDelete(id: string) {
    await fetch(`/api/audios/${id}`, { method: 'DELETE' })
    await refetch()
  }

  return (
    <div>
      <Header title="Gerenciar Áudios" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{audios.length} arquivo{audios.length !== 1 ? 's' : ''} cadastrado{audios.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setUploadOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload de Áudio
          </Button>
        </div>

        {error && <ErrorBanner message={`Erro ao carregar áudios: ${error}`} />}

        <AudioList audios={audios} loading={loading} onDelete={handleDelete} />
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload de Áudio">
        <AudioUploadForm
          onSuccess={() => {
            setUploadOpen(false)
            refetch()
          }}
        />
      </Modal>
    </div>
  )
}
