import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  formatBytes,
  formatDuration,
  isNodeOnline,
  formatDateTime,
  slugify,
  gerarCron,
} from '@/lib/utils'

describe('formatBytes', () => {
  it('formata zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formata bytes, KB e MB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })
})

describe('formatDuration', () => {
  it('retorna -- para valores vazios', () => {
    expect(formatDuration(0)).toBe('--')
    expect(formatDuration(NaN)).toBe('--')
  })

  it('formata minutos e segundos com zero à esquerda', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(599)).toBe('9:59')
  })
})

describe('isNodeOnline', () => {
  afterEach(() => vi.useRealTimers())

  it('considera online quando o heartbeat é recente (< 90s)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-12T12:00:00Z'))
    const agora = new Date('2026-06-12T11:59:30Z') // 30s atrás
    expect(isNodeOnline(agora)).toBe(true)
  })

  it('considera offline quando o heartbeat é antigo (> 90s)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-12T12:00:00Z'))
    const antigo = new Date('2026-06-12T11:58:00Z') // 120s atrás
    expect(isNodeOnline(antigo)).toBe(false)
  })
})

describe('formatDateTime', () => {
  it('produz data no formato dd/mm/aaaa hh:mm', () => {
    const out = formatDateTime('2026-06-12T08:30:00')
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(out).toMatch(/\d{2}:\d{2}/)
  })
})

describe('slugify', () => {
  it('remove acentos, espaços e caracteres especiais', () => {
    expect(slugify('Olá Mundo!')).toBe('ola-mundo')
    expect(slugify('Áudio   de   Teste')).toBe('audio-de-teste')
    expect(slugify('--Trim--')).toBe('trim')
  })
})

describe('gerarCron', () => {
  it('retorna null quando nenhum dia é selecionado', () => {
    expect(gerarCron([], '08:00')).toBeNull()
  })

  it('usa * quando todos os 7 dias estão selecionados', () => {
    expect(gerarCron([0, 1, 2, 3, 4, 5, 6], '08:30')).toBe('30 08 * * *')
  })

  it('ordena os dias e monta a expressão', () => {
    expect(gerarCron([5, 1, 3], '07:15')).toBe('15 07 * * 1,3,5')
  })

  it('gera dias de semana úteis', () => {
    expect(gerarCron([1, 2, 3, 4, 5], '12:00')).toBe('00 12 * * 1,2,3,4,5')
  })
})
