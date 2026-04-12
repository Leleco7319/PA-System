'use client'

import { useState, useRef } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface AudioUploadFormProps {
  onSuccess: () => void
}

export default function AudioUploadForm({ onSuccess }: AudioUploadFormProps) {
  const [nome, setNome] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo || !nome.trim()) {
      setError('Nome e arquivo são obrigatórios')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('nome', nome.trim())
    formData.append('arquivo', arquivo)

    try {
      const res = await fetch('/api/audios', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao fazer upload')
      setNome('')
      setArquivo(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome do áudio"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex: Campainha da manhã"
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Arquivo (.mp3 ou .wav)</label>
        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.wav"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {arquivo && (
          <p className="text-xs text-gray-400">
            {arquivo.name} — {(arquivo.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" loading={loading} disabled={!arquivo || !nome.trim()}>
        Fazer Upload
      </Button>
    </form>
  )
}
