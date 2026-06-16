export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function isNodeOnline(ultimoHeartbeat: Date | string): boolean {
  const last = new Date(ultimoHeartbeat).getTime()
  return Date.now() - last < 90_000
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Gera expressão cron semanal ("mm hh * * dias") no formato consumido pelo
 * firmware ESP32 (0=Dom…6=Sáb). Retorna null se nenhum dia for selecionado.
 */
export function gerarCron(diasSelecionados: number[], horario: string): string | null {
  if (diasSelecionados.length === 0) return null
  const [hh, mm] = horario.split(':')
  const dias = diasSelecionados.length === 7
    ? '*'
    : [...diasSelecionados].sort((a, b) => a - b).join(',')
  return `${mm ?? '0'} ${hh ?? '0'} * * ${dias}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
