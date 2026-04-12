'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import SeletorNos from '@/components/on-demand/SeletorNos'
import GravacaoAudio from '@/components/on-demand/GravacaoAudio'
import Button from '@/components/ui/Button'
import type { IAudioJSON, INoJSON, IGrupoJSON } from '@/types'

interface Resultado { noId: string; ip: string; sucesso: boolean; erro?: string }

export default function OnDemandPage() {
  const [audios, setAudios] = useState<IAudioJSON[]>([])
  const [nos, setNos] = useState<INoJSON[]>([])
  const [grupos, setGrupos] = useState<IGrupoJSON[]>([])

  const [audioId, setAudioId] = useState('')
  const [nosIds, setNosIds] = useState<string[]>([])
  const [gruposIds, setGruposIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/audios').then(r => r.json()),
      fetch('/api/nos').then(r => r.json()),
      fetch('/api/grupos').then(r => r.json()),
    ]).then(([a, n, g]) => { setAudios(a); setNos(n); setGrupos(g) })
  }, [])

  async function handleTransmitir() {
    if (!audioId) { setError('Selecione um áudio'); return }
    if (nosIds.length === 0 && gruposIds.length === 0) { setError('Selecione ao menos um nó ou grupo'); return }
    setLoading(true)
    setError('')
    setResultados(null)
    try {
      const res = await fetch('/api/on-demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioId, nosIds, gruposIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao transmitir')
      setResultados(data.resultados)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao transmitir')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header title="Reprodução On-Demand" />
      <div className="p-6 max-w-2xl space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Selecionar Áudio</h2>
          <select
            value={audioId}
            onChange={(e) => setAudioId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Escolha um áudio…</option>
            {audios.map((a) => (
              <option key={a._id} value={a._id}>{a.nome}</option>
            ))}
          </select>

          <div className="border-t border-gray-100 pt-4">
            <GravacaoAudio
              onGravado={(file) => {
                // Upload automático da gravação
                const form = new FormData()
                form.append('arquivo', file)
                form.append('nome', `Gravação ${new Date().toLocaleString('pt-BR')}`)
                fetch('/api/audios', { method: 'POST', body: form })
                  .then(async r => {
                    const data = await r.json()
                    if (!r.ok) throw new Error(data.error ?? 'Erro ao salvar gravação')
                    return data
                  })
                  .then(audio => {
                    setAudios(prev => [audio, ...prev])
                    setAudioId(audio._id)
                  })
                  .catch(err => alert(err.message))
              }}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Destinos</h2>
          <SeletorNos
            nos={nos}
            grupos={grupos}
            nosIds={nosIds}
            gruposIds={gruposIds}
            onChangeNos={setNosIds}
            onChangeGrupos={setGruposIds}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button size="lg" onClick={handleTransmitir} loading={loading} className="w-full">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Transmitir Agora
        </Button>

        {resultados && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Resultado</p>
            {resultados.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${r.sucesso ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${r.sucesso ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-mono">{r.ip}</span>
                <span>{r.sucesso ? 'Enviado' : r.erro ?? 'Falhou'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
