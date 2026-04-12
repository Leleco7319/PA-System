import { Schema, model, models } from 'mongoose'
import type { IGrupo } from '@/types'

const GrupoSchema = new Schema<IGrupo>(
  {
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, default: '' },
    nos: [{ type: Schema.Types.ObjectId, ref: 'No' }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const GrupoModel = models.Grupo || model<IGrupo>('Grupo', GrupoSchema)
export default GrupoModel
