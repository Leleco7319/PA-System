import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { verificarNodeKey } from '@/lib/node-auth'

const KEY = 'chave-secreta-de-teste'

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/node/heartbeat', { headers })
}

describe('verificarNodeKey', () => {
  const original = process.env.NODE_API_KEY

  beforeEach(() => {
    process.env.NODE_API_KEY = KEY
  })
  afterEach(() => {
    process.env.NODE_API_KEY = original
  })

  it('aceita quando o header x-node-key bate', () => {
    expect(verificarNodeKey(req({ 'x-node-key': KEY }))).toBe(true)
  })

  it('rejeita quando o header está errado', () => {
    expect(verificarNodeKey(req({ 'x-node-key': 'errada' }))).toBe(false)
  })

  it('rejeita quando o header está ausente', () => {
    expect(verificarNodeKey(req())).toBe(false)
  })

  it('rejeita tudo (fail-closed) quando NODE_API_KEY não está configurada', () => {
    delete process.env.NODE_API_KEY
    expect(verificarNodeKey(req({ 'x-node-key': '' }))).toBe(false)
    expect(verificarNodeKey(req({ 'x-node-key': KEY }))).toBe(false)
  })
})
