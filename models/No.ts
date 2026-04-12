import { Schema, model, models } from 'mongoose'
import type { INo } from '@/types'

const NoSchema = new Schema<INo>(
  {
    nome: { type: String, required: true, trim: true },
    ip: { type: String, required: true },
    macAddress: { type: String, required: true, unique: true },
    grupos: [{ type: Schema.Types.ObjectId, ref: 'Grupo' }],
    online: { type: Boolean, default: false },
    ultimoHeartbeat: { type: Date, default: new Date(0) },
    versaoFirmware: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const NoModel = models.No || model<INo>('No', NoSchema)
export default NoModel
