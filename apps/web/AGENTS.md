<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Milheiro — Gerenciador de Pontos e Milhas

Personal web app to track points/miles accumulation, transfers, and sales with weighted-average CPM PnL.

## Stack

- Next.js 16.2.9 (App Router, Turbopack)
- Tailwind CSS v4
- shadcn/ui v4 (Base UI primitives)
- Supabase (PostgreSQL, local via `supabase start`)
- TypeScript strict

## Key Commands

```bash
# Dev server (must use & due to hanging)
cd apps/web && kill -9 $(pgrep -f next) 2>/dev/null; sleep 1; (npx next dev -p 3000 </dev/null &>/tmp/next-start.log &)

# TypeScript check
cd apps/web && npx tsc --noEmit

# DB reset + re-grant permissions
cd /home/andreluiz0787/repos/milheiro && npx supabase db reset
# Then grant permissions (5 separate queries):
npx supabase db query "GRANT USAGE ON SCHEMA public TO anon, authenticated"
npx supabase db query "GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated"
npx supabase db query "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated"
npx supabase db query "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated"
npx supabase db query "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated"

# Full flow: reset + grant + start
cd /home/andreluiz0787/repos/milheiro && npx supabase db reset && \
  npx supabase db query "GRANT USAGE ON SCHEMA public TO anon, authenticated" && \
  npx supabase db query "GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated" && \
  npx supabase db query "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated" && \
  npx supabase db query "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated" && \
  npx supabase db query "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated"
```

## Project Structure

```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard (server component, force-dynamic)
│   ├── layout.tsx          # Root layout with Sidebar + ThemeProvider
│   ├── globals.css         # VS Code gray palette (--color-*) in :root/.dark
│   ├── api/                # Route handlers
│   │   ├── programs/, holders/, cpfs/, operation-types/
│   │   ├── entries/, transfers/, sales/, tickets/
│   │   └── balances/, tickets/check/
│   ├── sales/              # /sales, /sales/new, /sales/[id]
│   ├── tickets/            # /tickets, /tickets/new, /tickets/[id]
│   ├── entries/            # /entries, /entries/new, /entries/[id]
│   ├── transfers/          # /transfers, /transfers/new, /transfers/[id]
│   ├── programs/           # CRUD
│   ├── holders/            # CRUD
│   ├── cpfs/               # CRUD
│   └── operation-types/    # CRUD
├── components/
│   ├── ui/                 # shadcn/ui (button, card, dialog, input, label, select, table)
│   ├── forms/              # sale-form, entry-form, transfer-form, ticket-form, inline-create-dialog, op-type-form
│   ├── tables/             # sales-table, tickets-table, entries-table, transfers-table, holders-table, cpfs-table, op-types-table
│   ├── dashboard/pnl-table.tsx
│   ├── data-table/data-table.tsx  # Generic TanStack Table wrapper
│   ├── sidebar.tsx, theme-toggle.tsx, theme-provider.tsx
│   ├── delete-button.tsx, clear-all-button.tsx, received-toggle.tsx
│   └── forms/inline-create-dialog.tsx
├── types/index.ts          # All types (Sale, Ticket, Entry, Transfer, Program, Holder, Cpf, etc.)
└── lib/
    ├── supabase/server.ts  # createClient() — read cookies via await cookies()
    └── utils.ts            # cn(), formatCurrency(), formatDate(), formatNumber()
```

## Database Schema (9 migrations)

```
tenants            (id UUID PK, name, slug)
programs           (id, tenant_id, name, slug, category: points|miles, emission_limit, limit_window_type, limit_window_days, limit_start_date, cooldown_days)
holders            (id, tenant_id, name, nickname)
cpfs               (id, tenant_id, name, document, telegram)
operation_types    (id, tenant_id, name, slug, is_purchase)
entries            (id, tenant_id, program_id FK, holder_id FK, operation_type_id FK?, date, points, cost, notes)
transfers          (id, tenant_id, from_program_id FK, to_program_id FK, holder_id FK, date, points_sent, bonus_pct, points_received, transfer_fee, notes)
sales              (id, tenant_id, program_id FK, holder_id FK, buyer_id FK→cpfs, ticket_id FK→tickets, date, points_sold, sale_value, profit_auto, profit_override, profit_final, received BOOL, cpm_at_sale, notes)
tickets            (id, tenant_id, program_id FK, holder_id FK, sale_id FK, issued_at, outbound_date, return_date, ticket_info)
ticket_cpfs        (ticket_id FK, cpf_id FK) — N:N junction
balances           (id, tenant_id, program_id FK, holder_id FK, total_points, total_cost, cpm GENERATED)
```

### Triggers

| Trigger | Event | Purpose |
|---------|-------|---------|
| `trg_entry_upsert` | BEFORE INSERT | Credits balance, recalculates CPM |
| `trg_entry_delete` | AFTER DELETE | Reverts balance credit |
| `trg_sale_upsert` | BEFORE INSERT | Debits balance, calculates profit_auto/final |
| `trg_sale_delete` | AFTER DELETE | Reverts balance debit |
| `trg_sale_update_profit` | BEFORE UPDATE (conditional) | Recalculates profit on value/pts/override change |
| `trg_transfer_upsert` | BEFORE INSERT | Debits from_program, credits to_program with bonus |
| `trg_transfer_delete` | AFTER DELETE | Reverts transfer balances |

### Key: sale update trigger only fires on profit-related field changes
```sql
CREATE TRIGGER trg_sale_update_profit BEFORE UPDATE ON sales
FOR EACH ROW WHEN (
  OLD.sale_value IS DISTINCT FROM NEW.sale_value
  OR OLD.points_sold IS DISTINCT FROM NEW.points_sold
  OR OLD.profit_override IS DISTINCT FROM NEW.profit_override
  OR OLD.program_id IS DISTINCT FROM NEW.program_id
  OR OLD.holder_id IS DISTINCT FROM NEW.holder_id
)
```

## Business Model

### Flow: Compra → Transferência → Venda
1. **Entrada** (Entry): buying points, increments balance, affects CPM
2. **Transferência** (Transfer): points→miles program, with bonus%
3. **Venda** (Sale): selling miles to a buyer
   - **Comprador** (buyer_id → cpfs): who pays
   - **Bilhete** (ticket): inline in sale form, has N viajantes (ticket_cpfs)

### Key rules
- Sales only in `miles` category programs
- `cpf_id` is on **ticket** (viajante), NOT on sale
- CPFs have optional `document` and `telegram`
- `received` flag on sales: PnL only counts received=true; unreceived shown as "Aguardando Recebimento"
- Balance unaffected by `received` toggle (trigger is INSERT-only)
- Tickets can have multiple CPFs (viajantes) via `ticket_cpfs` junction
- Delete of operation_type blocked by FK if entries reference it

## Critical UI Patterns

### Base UI Select
- `Select.Root` needs `value` prop for pre-filling in edit forms
- SelectValue children render function `(v) => ReactNode` shows names instead of UUIDs
- Must pass `name` prop for form serialization

### InlineCreateDialog
- Type `CreateType = "program" | "holder" | "cpf" | "buyer" | "optype"`
- Creates entities inline without navigation, preserving form state
- Auto-selects the new entity after creation

### DataTable
- Generic wrapper around `@tanstack/react-table`
- Pagination included

### Theming
- CSS variables `--color-*` defined in `:root`/`.dark` directly (not `@theme inline`)
- `@theme` block with `initial` values for Tailwind utilities
- VS Code gray palette
- Semantic colors: `--color-profit: #2ea043`, `--color-loss: #f85149`

## Working Directory & Permissions

- Project: `/home/andreluiz0787/repos/milheiro`
- Supabase local: started via `supabase start`
- Dev server must use `setsid` or background process with output to file
- Playwright: at `/home/andreluiz0787/.npm/_npx/.../playwright`
- Chromium: `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`

## Known Issues & Gotchas

1. **supabase db reset** wipes permissions — always re-grant after reset
2. **Next.js 16** has breaking changes from v13/v14 — consult `node_modules/next/dist/docs/`
3. **Tailwind v4** `@theme inline` with `var()` causes empty computed variables — use direct `:root` definitions
4. **Base UI** uses `nativeButton` auto-detect: `render` prop → false, plain `<button>` → true
5. **Dev server** tends to hang on background — kill all before restart
6. **TypeScript cache** — delete `.next` after renaming/removing routes
7. **Supabase `.or()`** — chaining `.eq()` then `.or()` doesn't combine as expected; use `.or('col.eq.val,col.is.null')` directly
8. **Server components** — add `export const dynamic = 'force-dynamic'` to pages that must always re-fetch
9. **RSC payload** — Next.js sends binary RSC on client navigation, not full HTML; `curl` needs `-H "Accept: text/html"` for testing
