import { Schema, model, models } from 'mongoose'
import bcrypt from 'bcryptjs'
import type { IUser } from '@/types'

const UserSchema = new Schema<IUser>(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senha: { type: String, required: true },
  },
  { timestamps: true }
)

UserSchema.pre('save', async function () {
  if (!this.isModified('senha')) return
  this.senha = await bcrypt.hash(this.senha, 12)
})

const UserModel = models.User || model<IUser>('User', UserSchema)
export default UserModel
