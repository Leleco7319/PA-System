import { NextRequest } from 'next/server'
import { vi } from 'vitest'

/** Constrói um NextRequest com body JSON. */
export function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** NextRequest simples (GET/DELETE sem corpo). */
export function simpleRequest(url: string, method = 'GET', headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method, headers })
}

/** Embrulha um valor em `{ params: Promise<...> }` como o Next 16 entrega. */
export function ctx<T extends object>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) }
}

/** Query chain `Model.find(...).lean()` (com .sort/.populate opcionais encadeáveis). */
export function leanQuery(result: unknown) {
  const chain: Record<string, unknown> = {
    lean: vi.fn().mockResolvedValue(result),
    sort: vi.fn(() => chain),
    populate: vi.fn(() => chain),
    select: vi.fn(() => chain),
  }
  return chain
}
