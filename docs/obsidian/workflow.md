---
tags: [workflow, process, git]
---

# Development Workflow

## Branch Strategy
```
master ────── produção
  └── develop ── desenvolvimento
       └── feat/* ── features
       └── fix/*  ── correções
```

## Daily Flow
1. `git checkout develop`
2. `git checkout -b feat/nova-feature`
3. Desenvolver + testar local
4. `git push origin feat/nova-feature` → preview URL automática
5. Testar no preview
6. Merge na develop: `git checkout develop && git merge feat/nova-feature`
7. Push develop → novo preview
8. Quando pronto: merge na master → **produção**

## Post-Deploy Routine (ALWAYS)
1. Update `CHANGELOG.md` with new version entry
2. Update Obsidian docs (`docs/obsidian/`) if new features added
3. Update `apps/web/AGENTS.md` if new patterns/conventions introduced
4. Commit: `git add -A && git commit -m "chore: update memory files post-deploy vX.Y.Z"`
5. Push to master
6. Verify production URL returns 200

## Commit Convention
```
feat: descrição
fix: descrição
chore: descrição
refactor: descrição
```

## Commands Quick Reference
```bash
# TypeScript check
cd apps/web && npx tsc --noEmit

# Supabase console
npx supabase status

# Supabase DB push (cloud)
npx supabase db push

# Vercel manual deploy
cd apps/web && npx vercel --prod

# Vercel list deployments
cd apps/web && npx vercel list web
```

## Testing
- Playwright at `/home/andreluiz0787/.npm/_npx/.../playwright`
- Chromium: `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`
- Test patterns: `node -e "const {chromium}=require('...'); ..."` 

## Known Gotchas
1. `supabase db reset` wipes permissions — always re-grant
2. `.next` cache must be deleted after route renames
3. Dev server may hang — kill with `pkill -f "node.*next"` before restart
4. `SSelectValue` renders `value` prop, not `ItemText` — use render function
5. `Supabase .or()` — use `.or('col.eq.val,col.is.null')` directly, don't chain `.eq()` then `.or()`
6. Server components — add `export const dynamic = 'force-dynamic'` if data must always be fresh
