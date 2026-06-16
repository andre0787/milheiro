import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/entries', label: 'Entradas', icon: '📥' },
  { href: '/transfers', label: 'Transferências', icon: '🔄' },
  { href: '/sales', label: 'Vendas', icon: '💰' },
  { href: '/holders', label: 'Titulares', icon: '👤' },
  { href: '/programs', label: 'Programas', icon: '🏪' },
  { href: '/cpfs', label: 'CPFs', icon: '🪪' },
  { href: '/operation-types', label: 'Tipos de Operação', icon: '🏷️' },
]

export function Sidebar() {
  return (
    <aside className="w-60 border-r bg-muted/30 p-4 flex flex-col gap-1">
      <div className="text-lg font-bold mb-6 px-2">Milheiro</div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <ThemeToggle />
      </div>
    </aside>
  )
}
