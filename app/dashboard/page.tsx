import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import NoModel from '@/models/No'
import AudioModel from '@/models/Audio'
import AgendamentoModel from '@/models/Agendamento'
import GrupoModel from '@/models/Grupo'
import { isNodeOnline } from '@/lib/utils'
import Header from '@/components/layout/Header'
import Link from 'next/link'

async function getStats() {
  await connectDB()
  const [nos, audios, agendamentos, grupos] = await Promise.all([
    NoModel.find().lean(),
    AudioModel.countDocuments(),
    AgendamentoModel.countDocuments({ status: 'pendente' }),
    GrupoModel.countDocuments(),
  ])
  const online = nos.filter((n) => isNodeOnline(n.ultimoHeartbeat)).length
  return { totalNos: nos.length, nosOnline: online, totalAudios: audios, agendamentosPendentes: agendamentos, totalGrupos: grupos }
}

export default async function DashboardPage() {
  await getServerSession(authOptions) // garante autenticação via middleware, mas aqui força revalidação
  const stats = await getStats()

  const cards = [
    { label: 'Nós Online', value: `${stats.nosOnline} / ${stats.totalNos}`, color: 'text-green-600', bg: 'bg-green-50', href: '/dashboard/nos' },
    { label: 'Áudios', value: stats.totalAudios, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/audios' },
    { label: 'Agendamentos Pendentes', value: stats.agendamentosPendentes, color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/dashboard/agendamentos' },
    { label: 'Grupos', value: stats.totalGrupos, color: 'text-purple-600', bg: 'bg-purple-50', href: '/dashboard/nos' },
  ]

  return (
    <div>
      <Header title="Visão Geral" />
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow"
            >
              <p className="text-sm text-gray-500 mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </Link>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/dashboard/on-demand" className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-blue-900">Reprodução On-Demand</p>
                <p className="text-xs text-blue-600">Transmitir agora</p>
              </div>
            </Link>
            <Link href="/dashboard/audios" className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-purple-900">Upload de Áudio</p>
                <p className="text-xs text-purple-600">Gerenciar arquivos</p>
              </div>
            </Link>
            <Link href="/dashboard/agendamentos" className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">Novo Agendamento</p>
                <p className="text-xs text-green-600">Programar reprodução</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
