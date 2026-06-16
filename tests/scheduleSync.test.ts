import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks dos models Mongoose (apenas o que resolveNodes usa)
vi.mock('@/models/No', () => ({ default: { find: vi.fn() } }))
vi.mock('@/models/Grupo', () => ({ default: { find: vi.fn() } }))
vi.mock('@/models/Agendamento', () => ({ default: { find: vi.fn() } }))

import NoModel from '@/models/No'
import GrupoModel from '@/models/Grupo'
import { resolveNodes, resolveNodeIds } from '@/lib/scheduleSync'

const NoFind = NoModel.find as unknown as ReturnType<typeof vi.fn>
const GrupoFind = GrupoModel.find as unknown as ReturnType<typeof vi.fn>

/** Query chain de NoModel.find(...).lean() */
function noQuery(result: unknown[]) {
  return { lean: vi.fn().mockResolvedValue(result) }
}

/** Query chain de GrupoModel.find(...).populate('nos').lean() */
function grupoQuery(result: unknown[]) {
  return { populate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(result) }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveNodes', () => {
  it('retorna apenas os nós diretos quando não há grupos', async () => {
    NoFind.mockReturnValue(noQuery([{ _id: 'n1', ip: '1.1.1.1' }]))

    const nodes = await resolveNodes(['n1'], [])
    expect(nodes).toHaveLength(1)
    expect(nodes[0]._id).toBe('n1')
    expect(GrupoFind).not.toHaveBeenCalled()
  })

  it('expande os nós dos grupos', async () => {
    NoFind.mockReturnValue(noQuery([]))
    GrupoFind.mockReturnValue(
      grupoQuery([{ _id: 'g1', nos: [{ _id: 'n2', ip: '2.2.2.2' }] }])
    )

    const nodes = await resolveNodes([], ['g1'])
    expect(nodes.map((n) => n._id)).toEqual(['n2'])
  })

  it('deduplica nós que aparecem direto e via grupo', async () => {
    NoFind.mockReturnValue(noQuery([{ _id: 'n1', ip: '1.1.1.1' }]))
    GrupoFind.mockReturnValue(
      grupoQuery([
        {
          _id: 'g1',
          nos: [
            { _id: 'n1', ip: '1.1.1.1' }, // duplicado
            { _id: 'n2', ip: '2.2.2.2' },
          ],
        },
      ])
    )

    const nodes = await resolveNodes(['n1'], ['g1'])
    expect(nodes.map((n) => String(n._id)).sort()).toEqual(['n1', 'n2'])
  })
})

describe('resolveNodeIds', () => {
  it('retorna a lista de IDs como string, deduplicada', async () => {
    NoFind.mockReturnValue(noQuery([{ _id: 'n1', ip: '1.1.1.1' }]))
    GrupoFind.mockReturnValue(
      grupoQuery([{ _id: 'g1', nos: [{ _id: 'n1' }, { _id: 'n2' }] }])
    )

    const ids = await resolveNodeIds(['n1'], ['g1'])
    expect(ids.sort()).toEqual(['n1', 'n2'])
  })
})
