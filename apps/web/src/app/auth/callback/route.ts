import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const resolvedOrigin = forwardedHost
    ? `${request.headers.get('x-forwarded-proto') ?? 'https'}://${forwardedHost}`
    : origin

  const response = NextResponse.redirect(`${resolvedOrigin}${next}`)

  if (code) {
    const cookieStore = await cookies()
    let cookiesSet = 0
    const reqCookies = cookieStore.getAll()
    const hasVerifier = reqCookies.some(c => c.name.includes('code-verifier'))
    console.log('[CALLBACK] code present, request cookies:', reqCookies.length, 'has verifier:', hasVerifier)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesSet += cookiesToSet.length
            console.log('[CALLBACK] setAll called with', cookiesToSet.length, 'cookies')
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('[CALLBACK]   setting cookie:', name, 'value length:', value.length)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[CALLBACK] exchange result:', exchangeError ? 'FAIL: ' + exchangeError.message : 'OK')

    if (!exchangeError) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('[CALLBACK] getUser:', user ? 'OK id=' + user.id : 'FAIL', userError?.message || '')
      if (user) {
        const admin = createAdminClient()
        const { error: upsertError } = await admin
          .from('user_tenants')
          .upsert({
            user_id: user.id,
            tenant_id: '00000000-0000-0000-0000-000000000001',
          })
        console.log('[CALLBACK] upsert user_tenants:', upsertError ? 'FAIL: ' + upsertError.message : 'OK')
      }
    }

    console.log('[CALLBACK] total cookies set on response:', cookiesSet)
    console.log('[CALLBACK] redirecting to:', `${resolvedOrigin}${next}`)
  }

  return response
}
