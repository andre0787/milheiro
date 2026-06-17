# Autenticação Google Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login via Supabase Auth, replace `allow_all` RLS with per-tenant isolation, and show user identity in the sidebar.

**Architecture:** Middleware refreshes Supabase session; `/login` shows Google sign-in button; `/auth/callback` exchanges OAuth code and creates `user_tenants` mapping on first login; `AuthProvider` wraps the app with session context; RLS filters all 11 tables by `tenant_id = get_tenant_id()`.

**Tech Stack:** Supabase Auth (Google OAuth), `@supabase/ssr` (already installed), Next.js middleware, React Context

---

### Task 1: Database Migration — user_tenants + RLS

**Files:**
- Create: `supabase/migrations/011_auth_rls.sql`

- [ ] **Step 1: Write migration file**

```sql
-- 011_auth_rls.sql
-- Authentication: user→tenant mapping + per-tenant RLS policies

CREATE TABLE user_tenants (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_tenants IS 'Maps Supabase Auth user_id to tenant_id. First Google login associates with default tenant.';

-- RLS helper: returns tenant_id for the authenticated user
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
$$;

-- Replace allow_all policies with tenant_isolation on all 11 tables

DROP POLICY IF EXISTS "allow_all" ON tenants;
CREATE POLICY "tenant_isolation" ON tenants
  FOR ALL USING (id = get_tenant_id())
  WITH CHECK (id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON programs;
CREATE POLICY "tenant_isolation" ON programs
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON holders;
CREATE POLICY "tenant_isolation" ON holders
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON cpfs;
CREATE POLICY "tenant_isolation" ON cpfs
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON operation_types;
CREATE POLICY "tenant_isolation" ON operation_types
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON entries;
CREATE POLICY "tenant_isolation" ON entries
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON transfers;
CREATE POLICY "tenant_isolation" ON transfers
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON sales;
CREATE POLICY "tenant_isolation" ON sales
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON tickets;
CREATE POLICY "tenant_isolation" ON tickets
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON ticket_cpfs;
CREATE POLICY "tenant_isolation" ON ticket_cpfs
  FOR ALL USING (
    ticket_id IN (SELECT id FROM tickets WHERE tenant_id = get_tenant_id())
    AND cpf_id IN (SELECT id FROM cpfs WHERE tenant_id = get_tenant_id())
  )
  WITH CHECK (
    ticket_id IN (SELECT id FROM tickets WHERE tenant_id = get_tenant_id())
    AND cpf_id IN (SELECT id FROM cpfs WHERE tenant_id = get_tenant_id())
  );

DROP POLICY IF EXISTS "allow_all" ON balances;
CREATE POLICY "tenant_isolation" ON balances
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- Protect user_tenants itself
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_mapping" ON user_tenants
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "service_insert" ON user_tenants
  FOR INSERT WITH CHECK (true);

-- Re-grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
```

- [ ] **Step 2: Apply migration locally**

```bash
cd /home/andreluiz0787/repos/milheiro && npx supabase db reset
```

Expected: migration 011 runs successfully in sequence after 001-010.

- [ ] **Step 3: Verify RLS is active**

```bash
npx supabase db query "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename"
```

Expected: 13 policies — 11 `tenant_isolation` + `user_own_mapping` + `service_insert`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_auth_rls.sql
git commit -m "feat(auth): migration 011 — user_tenants + per-tenant RLS"
```

---

### Task 2: Configure Google OAuth in config.toml

**Files:**
- Modify: `supabase/config.toml:155-165` (site_url and redirect_urls)
- Modify: `supabase/config.toml:319-335` (Apple provider → Google)

- [ ] **Step 1: Update site_url and additional_redirect_urls**

Open `supabase/config.toml` and replace lines 159-163:

```toml
# Before:
site_url = "http://127.0.0.1:3000"
# A list of *exact* URLs that auth providers are permitted to redirect to post authentication.
additional_redirect_urls = ["https://127.0.0.1:3000"]

# After:
site_url = "http://localhost:3000"
# A list of *exact* URLs that auth providers are permitted to redirect to post authentication.
additional_redirect_urls = ["http://localhost:3000"]
```

- [ ] **Step 2: Replace Apple provider block with Google**

Replace the `[auth.external.apple]` block (lines 322-335) with:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
redirect_uri = ""
skip_nonce_check = false
```

- [ ] **Step 3: Commit**

```bash
git add supabase/config.toml
git commit -m "feat(auth): enable Google OAuth in config.toml"
```

---

### Task 3: Middleware — Session Refresh + Auth Guard

**Files:**
- Create: `apps/web/src/lib/supabase/middleware.ts`
- Create: `apps/web/middleware.ts`
- Modify: `apps/web/src/lib/supabase/server.ts:10`

- [ ] **Step 1: Create Supabase middleware client**

Write to `apps/web/src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isPublicPath = pathname === '/login' || pathname.startsWith('/auth/callback')

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Create middleware.ts**

Write to `apps/web/middleware.ts`:

```ts
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3: Fix server.ts setAll**

In `apps/web/src/lib/supabase/server.ts`, change line 10:

```ts
// Before:
{ cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }

// After:
{
  cookies: {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // setAll called from Server Component — ignore, middleware handles session
      }
    },
  },
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/middleware.ts apps/web/src/lib/supabase/middleware.ts apps/web/src/lib/supabase/server.ts
git commit -m "feat(auth): middleware — session refresh + /login redirect"
```

---

### Task 4: Auth Provider — React Context

**Files:**
- Create: `apps/web/src/components/auth-provider.tsx`

- [ ] **Step 1: Write AuthProvider component**

Write to `apps/web/src/components/auth-provider.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }, [supabase, router])

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/auth-provider.tsx
git commit -m "feat(auth): AuthProvider — React context for user session"
```

---

### Task 5: Login Page

**Files:**
- Create: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Write login page**

Write to `apps/web/src/app/login/page.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-sm space-y-8 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Gestao
          </h1>
          <p className="text-muted-foreground">Estoque de Pontos e Milhas</p>
        </div>
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-input bg-card px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Entrando...' : 'Entrar com Google'}
        </button>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Seus dados, so com voce.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat(auth): login page with Google sign-in button"
```

---

### Task 6: Auth Callback Route

**Files:**
- Create: `apps/web/src/app/auth/callback/route.ts`

- [ ] **Step 1: Write callback route handler**

Write to `apps/web/src/app/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
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
```

- [ ] **Step 2: Verify file structure**

```bash
ls apps/web/src/app/auth/callback/
```

Expected: `route.ts` exists.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/auth/callback/route.ts
git commit -m "feat(auth): OAuth callback — exchange code + user→tenant mapping"
```

---

### Task 7: Update Sidebar with User Identity

**Files:**
- Modify: `apps/web/src/components/sidebar.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Update sidebar to accept user prop and show avatar + logout**

Replace `apps/web/src/components/sidebar.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/components/auth-provider'

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/entries', label: 'Entradas', icon: '📥' },
  { href: '/transfers', label: 'Transferencias', icon: '🔄' },
  { href: '/sales', label: 'Vendas', icon: '💰' },
  { href: '/holders', label: 'Titulares', icon: '👤' },
  { href: '/programs', label: 'Programas', icon: '🏪' },
  { href: '/clientes', label: 'Clientes', icon: '🪪' },
  { href: '/operation-types', label: 'Tipos de Operacao', icon: '🏷️' },
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
```

- [ ] **Step 2: Wrap layout in AuthProvider**

Edit `apps/web/src/app/layout.tsx` — add the AuthProvider import and wrap:

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'

// ... (metadata + themeScript stay the same)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geist.className} bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto p-6">
                {children}
              </main>
            </div>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Use Edit to add the import line and wrap `children` area in `<AuthProvider>`.

- [ ] **Step 3: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/sidebar.tsx apps/web/src/app/layout.tsx
git commit -m "feat(auth): sidebar — avatar, user name, logout button"
```

---

### Task 8: Login Page Layout — No Sidebar

**Files:**
- Create: `apps/web/src/app/login/layout.tsx`

- [ ] **Step 1: Create minimal layout for login page**

Write to `apps/web/src/app/login/layout.tsx`:

```tsx
export const dynamic = 'force-static'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

This overrides the root layout's sidebar so the login page is full-screen clean.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/login/layout.tsx
git commit -m "feat(auth): login layout — no sidebar, full-screen"
```

---

### Task 9: Set Environment Variables

- [ ] **Step 1: Create .env.local for local development**

Add to `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
```

(These should already exist. If not, get values from `npx supabase status`.)

- [ ] **Step 2: Create .env.local for Supabase CLI**

Create `supabase/.env`:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<placeholder-for-now>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<placeholder-for-now>
```

For local dev testing, these can use placeholder values since Google OAuth only works from a real domain.

- [ ] **Step 3: Commit .env.local if not in .gitignore**

Note: `.env.local` is typically gitignored. Only commit the config changes that reference `env(...)`.

- [ ] **Step 4: Document Google Cloud setup**

Create `docs/supabase-google-oauth-setup.md`:

```markdown
# Google OAuth Setup for Supabase

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project or select existing
3. "Create Credentials" → "OAuth 2.0 Client ID"
4. Application type: "Web application"
5. Name: "Milheiro"
6. Authorized redirect URIs:
   - http://localhost:3000/auth/callback (local dev)
   - https://web-alpha-ashy-0yn7kj4k5v.vercel.app/auth/callback (production)
   - https://web-*.vercel.app/auth/callback (preview)

7. Copy Client ID and Client Secret
8. Go to Supabase Dashboard → Authentication → Providers → Google
9. Enable Google, paste Client ID and Secret
10. For local dev, add to supabase/.env:
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<client-id>
    SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<client-secret>
```

- [ ] **Step 5: Commit**

```bash
git add docs/supabase-google-oauth-setup.md
git commit -m "docs: Google OAuth setup guide for Supabase"
```

---

### Task 10: Push Migration to Supabase Cloud + Deploy

- [ ] **Step 1: Push migration to Supabase Cloud**

```bash
cd /home/andreluiz0787/repos/milheiro && npx supabase db push
```

Expected: migration 011 applied to `tcrxfeczxlohsdhkhgyq`.

- [ ] **Step 2: Set Vercel env vars for Google OAuth**

Via Vercel Dashboard or API, set for production + preview + development:
- `NEXT_PUBLIC_SUPABASE_URL` = (already set)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (already set)
- `SUPABASE_SERVICE_ROLE_KEY` = (already set)
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` = (from Google Cloud)
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` = (from Google Cloud)

But wait — the Google env vars are used via `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` in config.toml. On Supabase Cloud, you set these in the Supabase Dashboard (Project Settings → API → Auth providers → Google). They won't be needed as Vercel env vars because Supabase Auth handles the OAuth flow directly, not the Next.js app.

- [ ] **Step 3: Push to create preview branch and test**

```bash
cd /home/andreluiz0787/repos/milheiro && git checkout -b feat/auth && git push origin feat/auth
```

Wait for Vercel preview deploy. Verify:
- `/` redirects to `/login` (not logged in)
- `/login` shows Google button
- Clicking Google button starts OAuth flow (should work if Google OAuth is configured in Supabase Dashboard)

- [ ] **Step 4: Merge to develop for testing, then master for production**

```bash
git checkout develop && git merge feat/auth && git push origin develop
# ... test preview ...
git checkout master && git merge develop && git push origin master
```

---

### Task 11: Update CHANGELOG + Memory Files

- [ ] **Step 1: Add v0.2.0 entry to CHANGELOG.md**

```markdown
## v0.2.0 — Login com Google (2026-06-16)
- Auth: Google OAuth via Supabase Auth
- Middleware: session refresh + redirect /login
- `/login`: botão "Entrar com Google", título "Gestao — Estoque de Pontos e Milhas"
- RLS: política `tenant_isolation` (filtra por tenant do usuário)
- Migration 011: `user_tenants` + `get_tenant_id()` + novas políticas
- Sidebar: avatar, nome do usuário, botão Sair
- AuthProvider: React Context com user session + signOut
- Admin client mantido para FK guards (bypass RLS)
- Primeiro login: associa ao tenant `0000...0001` (dados preservados)
```

- [ ] **Step 2: Update AGENTS.md**

Add auth context to the Stack section:
```
- Auth: Supabase Auth (Google OAuth), middleware session refresh
```

- [ ] **Step 3: Update Obsidian docs**

Update `docs/obsidian/Home.md` version to v0.2.0.
Update `docs/obsidian/deploy.md` with new auth config details.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md apps/web/AGENTS.md docs/obsidian/
git commit -m "chore: update memory files post-deploy v0.2.0"
git push origin master
```

---

### Verification Checklist

After all tasks complete, verify:

- [ ] `curl http://localhost:3000` → redirect to `/login` (302)
- [ ] `curl http://localhost:3000/login` → shows login page (200)
- [ ] Login page has Google button with working SVG
- [ ] After Google login, redirected to Dashboard at `/`
- [ ] Sidebar shows user avatar + name
- [ ] Logout button works, returns to `/login`
- [ ] All CRUD pages work (programs, holders, clientes, operations, entries, transfers, sales, tickets)
- [ ] Sales page inline CPF creation works
- [ ] Dashboard shows data (same as before login)
- [ ] `receivedToggle` works (updates sale.received)
- [ ] Delete guards show correct FK names
- [ ] `npx tsc --noEmit` passes clean
