import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase URL and Anon Key must be defined in environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
    },
    auth: {
      detectSessionInUrl: false,
    },
  })
}
