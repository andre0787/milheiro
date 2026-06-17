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
- All 11 tables have RLS enabled
- Policy: `allow_all` — USING (true) / WITH CHECK (true)
- For MVP without login; will be tightened when auth is added
