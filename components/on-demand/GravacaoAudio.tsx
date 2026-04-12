'use client'

import { useState, useRef } from 'react'
import Button from '@/components/ui/Button'

interface GravacaoAudioProps {
  onGravado: (file: File) => void
}

export default function GravacaoAudio({ onGravado }: GravacaoAudioProps) {
  const [gravando, setGravando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function iniciarGravacao() {
    setError('')
    setBlob(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const gravacao = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBlob(gravacao)
        if (timerRef.current) clearInterval(timerRef.current)
      }

      recorder.start()
      setGravando(true)
      setSegundos(0)
      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
    } catch {
      setError('Permissão de microfone negada ou indisponível')
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop()
    setGravando(false)
  }

  function usarGravacao() {
    if (!blob) return
    const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: 'audio/webm' })
    onGravado(file)
    setBlob(null)
    setSegundos(0)
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Gravar áudio ao vivo</p>

      <div className="flex items-center gap-3">
        {!gravando ? (
          <Button variant="secondary" size="sm" onClick={iniciarGravacao}>
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Gravar
          </Button>
        ) : (
          <Button variant="danger" size="sm" onClick={pararGravacao}>
            <span className="w-2 h-2 bg-white" />
            Parar
          </Button>
        )}

        {gravando && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <span className="animate-pulse w-2 h-2 rounded-full bg-red-500" />
            {String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {blob && (
        <div className="space-y-2">
          <audio controls src={URL.createObjectURL(blob)} className="w-full h-8" />
          <div className="flex gap-2">
            <Button size="sm" onClick={usarGravacao}>Usar esta gravação</Button>
            <Button variant="secondary" size="sm" onClick={() => { setBlob(null); setSegundos(0) }}>Descartar</Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
