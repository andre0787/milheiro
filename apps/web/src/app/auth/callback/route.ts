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

  if (code) {
    const cookieStore = await cookies()
    let capturedCookies: { name: string; value: string; options: Record<string, unknown> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            capturedCookies = cookiesToSet
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()
        const { error: upsertError } = await admin
          .from('user_tenants')
          .upsert({
            user_id: user.id,
            tenant_id: '00000000-0000-0000-0000-000000000001',
          })

        if (upsertError) {
          return NextResponse.redirect(`${resolvedOrigin}/login?error=${encodeURIComponent('Failed to initialize your account. Please try again.')}`)
        }
      }
    }

    const response = NextResponse.redirect(`${resolvedOrigin}${next}`)
    for (const c of capturedCookies) {
      response.cookies.set(c.name, c.value, c.options as Record<string, string | number | boolean>)
    }
    return response
  }

  return NextResponse.redirect(`${resolvedOrigin}${next}`)
}
