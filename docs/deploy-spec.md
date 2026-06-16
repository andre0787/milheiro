# Milheiro — Deploy to Supabase Cloud + Free Hosting

## Goal
Deploy the MVP to production: Supabase cloud (PostgreSQL) + free serverless hosting (Vercel/Render/Fly.io).

## Step 1: Supabase Cloud Project

### 1.1 Create project
- Go to https://supabase.com/dashboard
- New project → milheiro-prod
- Choose region closest to users (e.g. `sa-east-1` for Brazil)
- Set strong DB password

### 1.2 Migrate schema
```bash
cd supabase
supabase link --project-ref <project-ref>
supabase db push
```

### 1.3 Row-Level Security (RLS)
- Current MVP uses no login (fixed tenant UUID `00000000-...-000001`)
- Enable RLS on all tables
- Create policy: `USING (true)` for anon/authenticated roles
- This allows reads/writes without auth while we don't have login

### 1.4 Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # keep secret
```

## Step 2: Hosting Options (free)

### Option A: Vercel (recommended)
- Free Hobby plan
- Connect GitHub repo
- Set env vars (SUPABASE_URL, SUPABASE_ANON_KEY)
- Auto-deploy on push
- Custom domain supported
- Edge network, good latency
- URL: milheiro.vercel.app

### Option B: Render
- Free tier: 750h/month, sleeps after 15min inactivity
- Connect GitHub repo
- Build: `cd apps/web && npm install && npm run build`
- Start: `cd apps/web && npm start`
- URL: milheiro.onrender.com

### Option C: Fly.io
- Free: 3 shared VMs (256MB each)
- Requires `fly launch` + `fly deploy`
- More ops overhead but no cold start

## Step 3: Pre-deploy checklist

- [ ] Create Supabase cloud project
- [ ] Push schema (`supabase db push`)
- [ ] Enable RLS on all tables
- [ ] Create `.env.production` with cloud credentials
- [ ] Test build: `cd apps/web && npm run build`
- [ ] Choose and configure host
- [ ] Deploy
- [ ] Smoke test all pages
- [ ] Remove old screenshot/test artifacts from repo

## Step 4: Post-deploy

- [ ] Set custom domain (optional)
- [ ] Enable Supabase backups
- [ ] Monitor usage (Supabase free: 500MB DB, 2GB bandwidth)
- [ ] Add login/auth (future PRD)
