'use client'

import Header from '@/components/layout/Header'
import NoList from '@/components/nos/NoList'
import GrupoManager from '@/components/nos/GrupoManager'
import ErrorBanner from '@/components/ui/ErrorBanner'
import useApiList from '@/hooks/useApiList'
import type { INoJSON, IGrupoJSON } from '@/types'

// Polling a cada 10s para atualizar status online
const POLL_MS = 10_000

export default function NosPage() {
  const { data: nos, loading, error: nosError, refetch: refetchNos } = useApiList<INoJSON>('/api/nos', { pollMs: POLL_MS })
  const { data: grupos, error: gruposError, refetch: refetchGrupos } = useApiList<IGrupoJSON>('/api/grupos', { pollMs: POLL_MS })

  const error = nosError ?? gruposError

  async function refetchAll() {
    await Promise.all([refetchNos(), refetchGrupos()])
  }

  async function handleDeleteNo(id: string) {
    await fetch(`/api/nos/${id}`, { method: 'DELETE' })
    await refetchAll()
  }

  async function handleSincronizar(id: string) {
    await fetch(`/api/nos/${id}/sincronizar`, { method: 'POST' })
  }

  return (
    <div>
      <Header title="Nós / Grupos" />
      <div className="p-6 space-y-8">
        {error && <ErrorBanner message={`Erro ao carregar dados: ${error}`} />}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Nós registrados</h2>
            <p className="text-sm text-gray-400">
              {nos.filter(n => n.online).length} online · {nos.length} total
            </p>
          </div>
          <NoList nos={nos} loading={loading} onDelete={handleDeleteNo} onSincronizar={handleSincronizar} />
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <GrupoManager grupos={grupos} nos={nos} onRefresh={refetchAll} />
        </section>
      </div>
    </div>
  )
}
