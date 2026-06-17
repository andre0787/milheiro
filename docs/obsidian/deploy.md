---
tags: [deploy, vercel, supabase]
---

# Deployment

## Supabase Cloud
- **Project**: `tcrxfeczxlohsdhkhgyq`
- **Region**: South America (São Paulo)
- **URL**: https://tcrxfeczxlohsdhkhgyq.supabase.co
- **Backups**: Enable via Dashboard → Database → Backups

## Vercel
- **Project**: `andreluiz0787/web`
- **Production**: https://web-alpha-ashy-0yn7kj4k5v.vercel.app
- **Framework**: Next.js 16 (Turbopack)
- **Root Directory**: `apps/web`

## Environment Variables (Vercel)
| Key | Environment |
|-----|-------------|
| NEXT_PUBLIC_SUPABASE_URL | production, preview, development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | production, preview, development |
| SUPABASE_SERVICE_ROLE_KEY | production, preview, development |

## Deploy Process
1. Push `master` → auto-deploy production
2. Push any branch → auto-deploy preview URL
3. Preview URL format: `https://web-XXXXX-<branch>-andreluiz0787.vercel.app`

## Local Development
```bash
# Start Supabase
supabase start

# Start dev server
cd apps/web && npm run dev

# Reset DB
npx supabase db reset
npx supabase db query "GRANT USAGE ON SCHEMA public TO anon, authenticated"
npx supabase db query "GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated"
npx supabase db query "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated"
npx supabase db query "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated"
npx supabase db query "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated"
```

## RLS
- Todas as 11 tabelas com RLS ativo
- Politica: `tenant_isolation` — USING (tenant_id = get_tenant_id())
- Funcao `get_tenant_id()` retorna o tenant do usuario autenticado
- Migration 012: trigger `on_auth_user_created` cria user_tenants automaticamente

## Google OAuth Setup
1. Google Cloud Console → OAuth 2.0 Client ID
2. Authorized redirect URIs deve conter:
   - `https://tcrxfeczxlohsdhkhgyq.supabase.co/auth/v1/callback`
   - (as URLs do Vercel vao como `redirect_to`, nao como `redirect_uri`)
3. Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://web-alpha-ashy-0yn7kj4k5v.vercel.app`
   - Redirect URLs: adicionar `https://web-*.vercel.app/auth/callback`

## Deploy History

| Date | Version | What |
|------|---------|------|
| 2026-06-17 | v0.2.0 | Google OAuth + email/senha login, RLS tenant_isolation, middleware auth guard, sidebar user info |
| 2026-06-17 | v0.1.0 | Geist font + glassmorphism + warm light theme + gradient headings |
| 2026-06-16 | v0.0.4 | RLS migration + deploy spec |
| 2026-06-16 | v0.0.3 | Search in all tabs |
| 2026-06-16 | v0.0.2 | FK guards with real names |
| 2026-06-16 | v0.0.1 | Clientes rename + FK guards |
| 2026-06-16 | v0.0.0 | Initial MVP deploy |
