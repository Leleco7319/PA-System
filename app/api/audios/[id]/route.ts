import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import AudioModel from '@/models/Audio'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const audio = await AudioModel.findById(id)
  if (!audio) return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })

  const filePath = path.join(process.cwd(), 'public', 'uploads', audio.nomeArquivo)
  if (existsSync(filePath)) await unlink(filePath)

  await AudioModel.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
