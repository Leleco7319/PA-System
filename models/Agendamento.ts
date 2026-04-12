import { Schema, model, models } from 'mongoose'
import type { IAgendamento } from '@/types'

const AgendamentoSchema = new Schema<IAgendamento>(
  {
    audio: { type: Schema.Types.ObjectId, ref: 'Audio', required: true },
    nos: [{ type: Schema.Types.ObjectId, ref: 'No' }],
    grupos: [{ type: Schema.Types.ObjectId, ref: 'Grupo' }],
    dataHora: { type: Date, required: true },
    recorrente: { type: Boolean, default: false },
    cron: { type: String },
    status: {
      type: String,
      enum: ['pendente', 'executado', 'falhou'],
      default: 'pendente',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const AgendamentoModel = models.Agendamento || model<IAgendamento>('Agendamento', AgendamentoSchema)
export default AgendamentoModel
