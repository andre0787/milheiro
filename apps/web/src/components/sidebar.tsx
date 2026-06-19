'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/components/auth-provider'
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowLeftRight,
  DollarSign,
  Users,
  Building2,
  Contact,
  Tag,
  LogOut,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Navegação',
    links: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/entries', label: 'Entradas', icon: ArrowDownToLine },
      { href: '/transfers', label: 'Transferências', icon: ArrowLeftRight },
      { href: '/sales', label: 'Vendas', icon: DollarSign },
    ],
  },
  {
    label: 'Cadastros',
    links: [
      { href: '/holders', label: 'Titulares', icon: Users },
      { href: '/programs', label: 'Programas', icon: Building2 },
      { href: '/clientes', label: 'Clientes', icon: Contact },
      { href: '/operation-types', label: 'Tipos de Operação', icon: Tag },
    ],
  },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-2xl">
      <div className="flex items-center gap-3 border-b border-sidebar-border/50 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <DollarSign className="h-4 w-4" />
        </div>
        <div>
          <span className="text-sm font-semibold text-sidebar-foreground">Milheiro</span>
          <p className="text-xs text-sidebar-foreground/50">Gestão de Milhas</p>
        </div>
      </div>

      {user && (
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl bg-sidebar-accent/40 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
            {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.user_metadata?.full_name || user.email}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/40">{user.email}</p>
          </div>
        </div>
      )}

      <nav className="mt-4 flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.links.map((link) => {
                const Icon = link.icon
                const isActive =
                  link.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(link.href)

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70'
                    )} />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border/50 px-3 py-3">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          {user && (
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 transition-all hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
