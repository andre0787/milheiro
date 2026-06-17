import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()
        const { data: existing } = await admin
          .from('user_tenants')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existing) {
          await admin.from('user_tenants').insert({
            user_id: user.id,
            tenant_id: '00000000-0000-0000-0000-000000000001',
          })
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
