'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const done = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const code = new URL(window.location.href).searchParams.get('code')

    async function completeAuth() {
      if (!code) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push('/')
        } else {
          setError('Nenhum código de autenticação encontrado na URL.')
        }
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('auth/callback: exchange failed', exchangeError.message)
        setError(`Falha na autenticação: ${exchangeError.message}`)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/')
      } else {
        setError('Sessão não encontrada após autenticação.')
      }
    }

    completeAuth()
  }, [router, supabase])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Completando login...</p>
    </div>
  )
}
