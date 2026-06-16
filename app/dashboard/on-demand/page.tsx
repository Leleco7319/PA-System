'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import SeletorNos from '@/components/on-demand/SeletorNos'
import GravacaoAudio from '@/components/on-demand/GravacaoAudio'
import Button from '@/components/ui/Button'
import ErrorBanner from '@/components/ui/ErrorBanner'
import useApiList from '@/hooks/useApiList'
import type { IAudioJSON, INoJSON, IGrupoJSON } from '@/types'

interface Resultado { noId: string; ip: string; sucesso: boolean; erro?: string }

export default function OnDemandPage() {
  const { data: audios, error: audiosError } = useApiList<IAudioJSON>('/api/audios')
  const { data: nos, error: nosError } = useApiList<INoJSON>('/api/nos')
  const { data: grupos, error: gruposError } = useApiList<IGrupoJSON>('/api/grupos')
  const fetchError = audiosError ?? nosError ?? gruposError

  const [audioId, setAudioId] = useState('')
  const [gravacaoLabel, setGravacaoLabel] = useState('')
  const [nosIds, setNosIds] = useState<string[]>([])
  const [gruposIds, setGruposIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingGravacao, setUploadingGravacao] = useState(false)
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [error, setError] = useState('')

  async function handleTransmitir() {
    if (!audioId) { setError('Selecione ou grave um áudio'); return }
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
      // Clear recording state after transmitting (it was deleted from server)
      if (gravacaoLabel) {
        setAudioId('')
        setGravacaoLabel('')
      }
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
        {fetchError && <ErrorBanner message={`Erro ao carregar dados: ${fetchError}`} />}

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Selecionar Áudio</h2>
          <select
            value={gravacaoLabel ? '' : audioId}
            onChange={(e) => { setAudioId(e.target.value); setGravacaoLabel('') }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!!gravacaoLabel}
          >
            <option value="">Escolha um áudio da biblioteca…</option>
            {audios.map((a) => (
              <option key={a._id} value={a._id}>{a.nome}</option>
            ))}
          </select>

          {gravacaoLabel && (
            <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <span>{gravacaoLabel}</span>
              <button
                onClick={() => { setAudioId(''); setGravacaoLabel('') }}
                className="text-green-500 hover:text-green-700 font-medium"
              >
                Remover
              </button>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <GravacaoAudio
              onGravado={async (file) => {
                setError('')
                setUploadingGravacao(true)
                const form = new FormData()
                form.append('arquivo', file)
                try {
                  const r = await fetch('/api/on-demand/upload', { method: 'POST', body: form })
                  const data = await r.json()
                  if (!r.ok) throw new Error(data.error ?? 'Erro ao processar gravação')
                  setAudioId(data.audioId)
                  setGravacaoLabel(`Gravação ${new Date().toLocaleString('pt-BR')}`)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro ao processar gravação')
                } finally {
                  setUploadingGravacao(false)
                }
              }}
            />
            {uploadingGravacao && (
              <p className="mt-2 text-xs text-gray-500">Processando gravação…</p>
            )}
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
