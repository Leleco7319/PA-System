'use client'

import { signOut, useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{session?.user?.name}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Sair
        </Button>
      </div>
    </header>
  )
}
