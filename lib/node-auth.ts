import type { NextRequest } from 'next/server'
import { env } from '@/lib/env'

/**
 * Autenticação dos nós ESP32: chave fixa no header `x-node-key`.
 * Se NODE_API_KEY não estiver configurada, nega tudo (fail-closed).
 */
export function verificarNodeKey(request: NextRequest): boolean {
  const key = env.NODE_API_KEY
  return key !== '' && request.headers.get('x-node-key') === key
}
