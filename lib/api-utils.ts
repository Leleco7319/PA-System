import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import type { Session } from 'next-auth'
import type { ZodType } from 'zod'
import { authOptions } from '@/lib/auth'

/** Resposta de erro padronizada — shape `{ error }` usado por todas as rotas. */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/** Sessão NextAuth do usuário logado, ou null (rota deve responder 401). */
export async function requireSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

type ParseResult<T> = { data: T; error?: never } | { data?: never; error: NextResponse }

/**
 * Lê e valida o body JSON da requisição contra um schema zod.
 * Retorna `{ data }` ou `{ error }` já pronto para ser retornado (400).
 */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return { error: apiError('Body JSON inválido', 400) }
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    const message = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ')
    return { error: apiError(message, 400) }
  }

  return { data: result.data }
}

/**
 * Envolve um route handler com try/catch: exceções não tratadas viram 500
 * padronizado em vez de derrubar a requisição sem resposta.
 */
export function handleRoute<Args extends unknown[], R extends Response>(
  fn: (...args: Args) => Promise<R>
): (...args: Args) => Promise<R | NextResponse> {
  return async (...args: Args) => {
    try {
      return await fn(...args)
    } catch (err) {
      console.error('[api] erro não tratado:', err)
      const message = err instanceof Error ? err.message : 'Erro interno'
      return apiError(message, 500)
    }
  }
}
