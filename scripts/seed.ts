#!/usr/bin/env tsx
/**
 * Script de seed — cria o primeiro usuário administrador no MongoDB.
 * Uso: ADMIN_EMAIL=... ADMIN_SENHA=... npm run seed  (ou defina no .env.local)
 */

import mongoose from 'mongoose'
import { config } from 'dotenv'
import { resolve } from 'path'
import UserModel from '../models/User'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const senha = process.env.ADMIN_SENHA
  const nome = process.env.ADMIN_NOME ?? 'Administrador'

  if (!MONGODB_URI) {
    console.error('MONGODB_URI não definido no .env.local')
    process.exit(1)
  }
  if (!senha) {
    console.error('ADMIN_SENHA não definida — defina no .env.local ou na linha de comando.')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  console.log('Conectado ao MongoDB')

  const existe = await UserModel.findOne({ email })
  if (existe) {
    console.log(`Usuário ${email} já existe — nenhuma alteração feita.`)
  } else {
    // O hash bcrypt é feito pelo pre-save hook do model
    await UserModel.create({ nome, email, senha })
    console.log(`Usuário admin criado: ${email}`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
