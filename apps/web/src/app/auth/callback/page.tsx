'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const code = new URL(window.location.href).searchParams.get('code')

    async function completeAuth() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) console.error('auth/callback: exchange failed', error.message)
      }

      const { data: { session } } = await supabase.auth.getSession()
      router.push(session ? '/' : '/login')
    }

    completeAuth()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Completando login...</p>
    </div>
  )
}
