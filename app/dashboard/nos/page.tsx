'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import NoList from '@/components/nos/NoList'
import GrupoManager from '@/components/nos/GrupoManager'
import type { INoJSON, IGrupoJSON } from '@/types'

export default function NosPage() {
  const [nos, setNos] = useState<INoJSON[]>([])
  const [grupos, setGrupos] = useState<IGrupoJSON[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [nosRes, gruposRes] = await Promise.all([
      fetch('/api/nos').then(r => r.json()),
      fetch('/api/grupos').then(r => r.json()),
    ])
    setNos(nosRes)
    setGrupos(gruposRes)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    // Polling a cada 10s para atualizar status online
    const id = setInterval(fetchData, 10_000)
    return () => clearInterval(id)
  }, [fetchData])

  async function handleDeleteNo(id: string) {
    await fetch(`/api/nos/${id}`, { method: 'DELETE' })
    await fetchData()
  }

  async function handleSincronizar(id: string) {
    await fetch(`/api/nos/${id}/sincronizar`, { method: 'POST' })
  }

  return (
    <div>
      <Header title="Nós / Grupos" />
      <div className="p-6 space-y-8">
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
          <GrupoManager grupos={grupos} nos={nos} onRefresh={fetchData} />
        </section>
      </div>
    </div>
  )
}
