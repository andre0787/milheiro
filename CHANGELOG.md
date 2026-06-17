# Changelog

## v0.1.0 — Geist + Glassmorphism (2026-06-17)
- **Fonte**: Geist (Vercel) substitui Inter
- **Tema claro**: fundo off-white `oklch(98.5% 0.005 260)`, sidebar glass, cards com sombra
- **Tema escuro**: glassmorphism no sidebar, primário mais vibrante, cards com opacidade
- **Heading**: componente com gradiente `primary→accent` (aplicado no Dashboard)
- **Cards**: `shadow-sm` + `ring-foreground/5` (mais sutis)
- **Cantos**: `--radius: 0.75rem`

## v0.0.4 — RLS + Deploy Spec (2026-06-16)
- Migration 010: RLS enabled on all 11 tables with `allow_all` policy
- `docs/deploy-spec.md`: step-by-step Supabase Cloud + Vercel guide
- Supabase MCP server added to opencode.jsonc

## v0.0.3 — Search in all tabs (2026-06-16)
- DataTable `searchable` prop enabled in all 8 table components
- Global text filter across every column

## v0.0.2 — FK guards with real names (2026-06-16)
- DELETE guards show actual dependent record names
- Sales table: global search enabled

## v0.0.1 — Clientes rename + FK guards (2026-06-16)
- CPFs → Clientes (routes, pages, components, sidebar)
- FK guards on delete: clientes, holders, programs, sales, operation_types
- Delete + ClearAll in holders and programs

## v0.0.0 — MVP (2026-06-16)
- 10 tables, 7 triggers, 9 migrations
- Dashboard: Custo Total, Lucro Total, Aguardando Recebimento, CPM, PnL
- Full CRUD: programas, titulares, clientes, operações, entradas, transferências, vendas, bilhetes
- Vendas: inline ticket, múltiplos CPFs, comprador, toggle recebido
- Dark theme (VS Code gray)
- shadcn/ui v4 + Base UI + TanStack Table + Supabase
