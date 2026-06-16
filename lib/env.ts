import path from 'path'

/**
 * Ponto único de leitura de variáveis de ambiente do servidor.
 * A leitura é lazy (getters) para não quebrar o `next build`,
 * que roda sem as variáveis de runtime definidas.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Defina a variável ${name} no .env.local`)
  return value
}

export const env = {
  get MONGODB_URI(): string {
    return required('MONGODB_URI')
  },

  /** Chave compartilhada com os ESP32. Vazia ⇒ toda requisição /api/node/* é negada. */
  get NODE_API_KEY(): string {
    return process.env.NODE_API_KEY ?? ''
  },

  get MAX_UPLOAD_SIZE_MB(): number {
    const parsed = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '', 10)
    return Number.isNaN(parsed) ? 50 : parsed
  },

  /** Diretório absoluto onde os áudios são gravados. */
  get UPLOAD_DIR(): string {
    return path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? path.join('public', 'uploads'))
  },
}
