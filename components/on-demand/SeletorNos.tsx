'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import type { INoJSON, IGrupoJSON } from '@/types'

interface SeletorNosProps {
  nos: INoJSON[]
  grupos: IGrupoJSON[]
  nosIds: string[]
  gruposIds: string[]
  onChangeNos: (ids: string[]) => void
  onChangeGrupos: (ids: string[]) => void
}

export default function SeletorNos({ nos, grupos, nosIds, gruposIds, onChangeNos, onChangeGrupos }: SeletorNosProps) {
  const [aba, setAba] = useState<'nos' | 'grupos'>('nos')

  function toggleNo(id: string) {
    onChangeNos(nosIds.includes(id) ? nosIds.filter((x) => x !== id) : [...nosIds, id])
  }

  function toggleGrupo(id: string) {
    onChangeGrupos(gruposIds.includes(id) ? gruposIds.filter((x) => x !== id) : [...gruposIds, id])
  }

  const totalSelecionado = nosIds.length + gruposIds.length

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-200">
        {(['nos', 'grupos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAba(tab)}
            className={[
              'flex-1 py-2.5 text-sm font-medium transition-colors',
              aba === tab ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50',
            ].join(' ')}
          >
            {tab === 'nos' ? 'Nós' : 'Grupos'}
            {tab === 'nos' && nosIds.length > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{nosIds.length}</span>
            )}
            {tab === 'grupos' && gruposIds.length > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{gruposIds.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-3 max-h-48 overflow-y-auto space-y-1">
        {aba === 'nos' && (
          nos.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Nenhum nó registrado</p>
            : nos.map((no) => (
                <label key={no._id} className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={nosIds.includes(no._id)}
                    onChange={() => toggleNo(no._id)}
                    className="rounded"
                  />
                  <span className="flex-1 text-sm text-gray-900">{no.nome}</span>
                  <Badge color={no.online ? 'green' : 'red'}>{no.online ? 'Online' : 'Offline'}</Badge>
                </label>
              ))
        )}

        {aba === 'grupos' && (
          grupos.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Nenhum grupo criado</p>
            : grupos.map((g) => (
                <label key={g._id} className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={gruposIds.includes(g._id)}
                    onChange={() => toggleGrupo(g._id)}
                    className="rounded"
                  />
                  <span className="flex-1 text-sm text-gray-900">{g.nome}</span>
                  <span className="text-xs text-gray-400">{g.nos.length} nós</span>
                </label>
              ))
        )}
      </div>

      {totalSelecionado > 0 && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
          {totalSelecionado} destino{totalSelecionado > 1 ? 's' : ''} selecionado{totalSelecionado > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
