'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/components/auth-provider'

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/entries', label: 'Entradas', icon: '📥' },
  { href: '/transfers', label: 'Transferências', icon: '🔄' },
  { href: '/sales', label: 'Vendas', icon: '💰' },
  { href: '/holders', label: 'Titulares', icon: '👤' },
  { href: '/programs', label: 'Programas', icon: '🏪' },
  { href: '/clientes', label: 'Clientes', icon: '🪪' },
  { href: '/operation-types', label: 'Tipos de Operação', icon: '🏷️' },
]

export function Sidebar() {
  const { user, signOut } = useAuth()

  return (
    <aside className="w-60 border-r border-sidebar-border bg-sidebar backdrop-blur-xl p-4 flex flex-col gap-1">
      <div className="text-lg font-bold mb-2 px-2">Milheiro</div>

      {user && (
        <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-sidebar-accent/50">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {user.user_metadata?.full_name || user.email}
            </p>
          </div>
        </div>
      )}

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

      <div className="mt-auto flex flex-col gap-2">
        <ThemeToggle />
        {user && (
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground w-full"
          >
            <span>🚪</span>
            <span>Sair</span>
          </button>
        )}
      </div>
    </aside>
  )
}
