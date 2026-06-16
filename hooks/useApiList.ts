'use client'

import { useCallback, useEffect, useState } from 'react'

interface UseApiListOptions {
  /** Intervalo de polling em ms (ex.: 10_000). Sem polling se omitido. */
  pollMs?: number
}

interface UseApiListResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Busca uma lista JSON de uma rota da API com estados de loading/erro e
 * refetch manual. `loading` só é true no primeiro carregamento — os ciclos
 * de polling e refetch atualizam os dados sem piscar a UI.
 */
export default function useApiList<T>(url: string, { pollMs }: UseApiListOptions = {}): UseApiListResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url)
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const message = (body as { error?: string } | null)?.error ?? `Erro ${res.status}`
        throw new Error(message)
      }
      setData(body as T[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
    if (!pollMs) return
    const id = setInterval(fetchData, pollMs)
    return () => clearInterval(id)
  }, [fetchData, pollMs])

  return { data, loading, error, refetch: fetchData }
}
