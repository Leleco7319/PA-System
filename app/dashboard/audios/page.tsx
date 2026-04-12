'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import AudioUploadForm from '@/components/audios/AudioUploadForm'
import AudioList from '@/components/audios/AudioList'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { IAudioJSON } from '@/types'

export default function AudiosPage() {
  const [audios, setAudios] = useState<IAudioJSON[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const fetchAudios = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/audios')
    const data = await res.json()
    setAudios(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAudios() }, [fetchAudios])

  async function handleDelete(id: string) {
    await fetch(`/api/audios/${id}`, { method: 'DELETE' })
    await fetchAudios()
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

        <AudioList audios={audios} loading={loading} onDelete={handleDelete} />
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload de Áudio">
        <AudioUploadForm
          onSuccess={() => {
            setUploadOpen(false)
            fetchAudios()
          }}
        />
      </Modal>
    </div>
  )
}
