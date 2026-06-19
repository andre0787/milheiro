'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DollarSign, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setError('Conta criada! Verifique seu email para confirmar.')
        setLoading(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.48_0.15_251.473/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.67_0.167_35.791/0.08),transparent_50%)]" />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Milheiro</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestão de Pontos e Milhas</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-10 pr-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-10 pr-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Carregando...' : isSignUp ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? (
              <>Já tem conta?{' '}
                <button onClick={() => setIsSignUp(false)} className="font-medium text-primary underline-offset-4 hover:underline">
                  Entrar
                </button>
              </>
            ) : (
              <>Não tem conta?{' '}
                <button onClick={() => setIsSignUp(true)} className="font-medium text-primary underline-offset-4 hover:underline">
                  Criar conta
                </button>
              </>
            )}
          </p>

          {error && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              error.includes('sucesso') || error.includes('criada') || error.includes('Verifique')
                ? 'bg-profit/10 text-profit'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
