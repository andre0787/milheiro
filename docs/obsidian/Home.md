---
tags: [milheiro, mvp, overview]
created: 2026-06-16
updated: 2026-06-17
version: v0.1.0
---

# Milheiro — Gerenciador de Pontos e Milhas

App pessoal para rastrear acúmulo de pontos/milhas, transferências e vendas com PnL via CPM médio ponderado.

## Stack
- **Frontend**: Next.js 16.2.9 (App Router, Turbopack)
- **CSS**: Tailwind CSS v4 + shadcn/ui v4 (Base UI primitives)
- **Font**: Geist (Vercel)
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Theme**: Corporate light (warm off-white) / Business dark (glassmorphism)

## Estrutura
```
apps/web/src/
├── app/           → Next.js App Router (pages + API routes)
├── components/    → ui/ forms/ tables/ dashboard/
├── types/         → TypeScript interfaces
└── lib/           → supabase/ utils/
```

## Ambientes
| Ambiente | Branch | URL |
|----------|--------|-----|
| Produção | `master` | https://web-alpha-ashy-0yn7kj4k5v.vercel.app |
| Preview | `develop` | Vercel auto-preview |
| Local | qualquer | http://localhost:3000 |

## Links
- [[database-schema]]
- [[api-routes]]
- [[components]]
- [[business-rules]]
- [[deploy]]
- [[workflow]]
