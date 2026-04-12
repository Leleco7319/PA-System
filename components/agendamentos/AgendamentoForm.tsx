'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { IAudioJSON, INoJSON, IGrupoJSON } from '@/types'

const DIAS_SEMANA = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

function gerarCron(diasSelecionados: number[], horario: string): string {
  const [hh, mm] = horario.split(':')
  const dias = diasSelecionados.length === 7 ? '*' : diasSelecionados.sort((a, b) => a - b).join(',')
  return `${mm ?? '0'} ${hh ?? '0'} * * ${dias}`
}

interface AgendamentoFormProps {
  onSuccess: () => void
}

export default function AgendamentoForm({ onSuccess }: AgendamentoFormProps) {
  const [audios, setAudios] = useState<IAudioJSON[]>([])
  const [nos, setNos] = useState<INoJSON[]>([])
  const [grupos, setGrupos] = useState<IGrupoJSON[]>([])

  const [audioId, setAudioId] = useState('')
  const [nosIds, setNosIds] = useState<string[]>([])
  const [gruposIds, setGruposIds] = useState<string[]>([])
  const [dataHora, setDataHora] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5])
  const [horario, setHorario] = useState('08:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/audios').then((r) => r.json()),
      fetch('/api/nos').then((r) => r.json()),
      fetch('/api/grupos').then((r) => r.json()),
    ]).then(([a, n, g]) => {
      setAudios(a)
      setNos(n)
      setGrupos(g)
    })
  }, [])

  function toggleSelection(id: string, selected: string[], setSelected: (v: string[]) => void) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  function toggleDia(valor: number) {
    setDiasSelecionados((prev) =>
      prev.includes(valor) ? prev.filter((d) => d !== valor) : [...prev, valor]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!audioId) { setError('Selecione um áudio'); return }
    if (!recorrente && !dataHora) { setError('Informe a data e hora'); return }
    if (recorrente && diasSelecionados.length === 0) { setError('Selecione ao menos um dia da semana'); return }
    if (nosIds.length === 0 && gruposIds.length === 0) { setError('Selecione ao menos um nó ou grupo'); return }

    const cron = recorrente ? gerarCron(diasSelecionados, horario) : undefined
    const dataHoraFinal = recorrente
      ? (() => {
          const [hh, mm] = horario.split(':')
          const d = new Date()
          d.setHours(parseInt(hh), parseInt(mm), 0, 0)
          return d.toISOString()
        })()
      : dataHora

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioId, nosIds, gruposIds, dataHora: dataHoraFinal, recorrente, cron }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar agendamento')
      setAudioId('')
      setNosIds([])
      setGruposIds([])
      setDataHora('')
      setRecorrente(false)
      setDiasSelecionados([1, 2, 3, 4, 5])
      setHorario('08:00')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Áudio */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Áudio</label>
        <select
          value={audioId}
          onChange={(e) => setAudioId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione um áudio…</option>
          {audios.map((a) => (
            <option key={a._id} value={a._id}>{a.nome}</option>
          ))}
        </select>
      </div>

      {/* Tipo de agendamento */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setRecorrente(false)}
          className={[
            'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
            !recorrente ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          Data e hora únicas
        </button>
        <button
          type="button"
          onClick={() => setRecorrente(true)}
          className={[
            'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
            recorrente ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          Recorrente (semanal)
        </button>
      </div>

      {/* Agendamento único */}
      {!recorrente && (
        <Input
          label="Data e hora"
          type="datetime-local"
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
        />
      )}

      {/* Agendamento recorrente */}
      {recorrente && (
        <div className="space-y-4 bg-blue-50 rounded-xl p-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Dias da semana</label>
            <div className="flex gap-2">
              {DIAS_SEMANA.map((dia) => {
                const ativo = diasSelecionados.includes(dia.value)
                return (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDia(dia.value)}
                    className={[
                      'flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                      ativo
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400',
                    ].join(' ')}
                  >
                    {dia.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Input
            label="Horário"
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
          />

          {diasSelecionados.length > 0 && horario && (
            <p className="text-xs text-blue-600">
              Cron gerado: <code className="font-mono">{gerarCron(diasSelecionados, horario)}</code>
            </p>
          )}
        </div>
      )}

      {/* Nós */}
      {nos.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nós</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {nos.map((no) => (
              <label key={no._id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={nosIds.includes(no._id)}
                  onChange={() => toggleSelection(no._id, nosIds, setNosIds)}
                  className="rounded"
                />
                <span className={no.online ? 'text-gray-900' : 'text-gray-400'}>{no.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Grupos */}
      {grupos.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Grupos</label>
          <div className="grid grid-cols-2 gap-2">
            {grupos.map((g) => (
              <label key={g._id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={gruposIds.includes(g._id)}
                  onChange={() => toggleSelection(g._id, gruposIds, setGruposIds)}
                  className="rounded"
                />
                {g.nome}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" loading={loading}>
        Criar Agendamento
      </Button>
    </form>
  )
}
