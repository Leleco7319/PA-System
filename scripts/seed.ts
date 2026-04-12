#!/usr/bin/env tsx
/**
 * Script de seed — cria o primeiro usuário administrador no MongoDB.
 * Uso: npm run seed
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const senha = process.env.ADMIN_SENHA ?? 'admin123'
  const nome = process.env.ADMIN_NOME ?? 'Administrador'

  if (!MONGODB_URI) {
    console.error('MONGODB_URI não definido no .env.local')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  console.log('Conectado ao MongoDB')

  const UserSchema = new mongoose.Schema({
    nome: String,
    email: { type: String, unique: true },
    senha: String,
  }, { timestamps: true })

  const User = mongoose.models.User || mongoose.model('User', UserSchema)

  const existe = await User.findOne({ email })
  if (existe) {
    console.log(`Usuário ${email} já existe — nenhuma alteração feita.`)
  } else {
    const hash = await bcrypt.hash(senha, 12)
    await User.create({ nome, email, senha: hash })
    console.log(`Usuário admin criado: ${email} / senha: ${senha}`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
