type Color = 'green' | 'red' | 'yellow' | 'blue' | 'gray'

const colors: Record<Color, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
}

interface BadgeProps {
  color?: Color
  children: React.ReactNode
  dot?: boolean
}

export default function Badge({ color = 'gray', children, dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'}`} />}
      {children}
    </span>
  )
}
