import { Schema, model, models } from 'mongoose'
import type { IAudio } from '@/types'

const AudioSchema = new Schema<IAudio>(
  {
    nome: { type: String, required: true, trim: true },
    nomeArquivo: { type: String, required: true },
    tamanho: { type: Number, required: true },
    duracao: { type: Number },
    checksum: { type: String, required: true },
    temporario: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const AudioModel = models.Audio || model<IAudio>('Audio', AudioSchema)
export default AudioModel
