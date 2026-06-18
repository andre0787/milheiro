'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    setDone(true)

    const code = new URL(window.location.href).searchParams.get('code')

    async function completeAuth() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('auth/callback: exchange failed', error.message)
        }
      }
      router.push('/')
    }

    completeAuth()
  }, [router, supabase, done])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Completando login...</p>
    </div>
  )
}
