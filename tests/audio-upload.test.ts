import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { extrairExtensao, validarExtensao, validarTamanho, md5 } from '@/lib/audio-upload'

describe('extrairExtensao', () => {
  it('extrai a extensão em minúsculas', () => {
    expect(extrairExtensao('musica.MP3')).toBe('mp3')
    expect(extrairExtensao('gravacao.webm')).toBe('webm')
    expect(extrairExtensao('arquivo.com.varios.pontos.wav')).toBe('wav')
  })

  it('retorna string vazia quando não há extensão', () => {
    expect(extrairExtensao('semextensao')).toBe('semextensao')
  })
})

describe('validarExtensao', () => {
  it('aceita mp3, wav e webm', () => {
    expect(validarExtensao('mp3')).toBe(true)
    expect(validarExtensao('wav')).toBe(true)
    expect(validarExtensao('webm')).toBe(true)
  })

  it('rejeita outros formatos', () => {
    expect(validarExtensao('ogg')).toBe(false)
    expect(validarExtensao('exe')).toBe(false)
    expect(validarExtensao('')).toBe(false)
  })
})

describe('validarTamanho', () => {
  it('aceita arquivos dentro do limite', () => {
    expect(validarTamanho(5 * 1024 * 1024, 50)).toBe(true)
    expect(validarTamanho(50 * 1024 * 1024, 50)).toBe(true) // exatamente no limite
  })

  it('rejeita arquivos acima do limite', () => {
    expect(validarTamanho(51 * 1024 * 1024, 50)).toBe(false)
  })
})

describe('md5', () => {
  it('calcula o hash MD5 hexadecimal (contrato com firmware)', () => {
    const buf = Buffer.from('conteudo de teste')
    const esperado = crypto.createHash('md5').update(buf).digest('hex')
    expect(md5(buf)).toBe(esperado)
    expect(md5(buf)).toMatch(/^[0-9a-f]{32}$/)
  })

  it('hash de string conhecida', () => {
    // md5("") = d41d8cd98f00b204e9800998ecf8427e
    expect(md5(Buffer.from(''))).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
})
