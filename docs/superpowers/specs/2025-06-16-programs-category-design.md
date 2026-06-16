# Programs Category Design

Date: 2025-06-16
Status: Draft

## Problem

The current `programs` table treats all loyalty programs identically, but there are two distinct types:

- **Points programs** (Livelo, Esfera, Itaú): users accumulate points, transfer them to airlines. No emission limits.
- **Miles programs** (Latam Pass, Smiles, Azul): users receive transfers, sell miles, issue tickets. Emission limits and cooldowns apply.

Fields like `emission_limit`, `limit_window_type`, `cooldown_days` only apply to miles programs, creating ambiguity and making it possible to set limits on points programs where they have no meaning.

## Solution

Add a `category` column to `programs` to distinguish the two types, with business rule validation at the API layer.

### Schema Changes

Single `ALTER TABLE` migration — no new tables.

```sql
ALTER TABLE programs ADD COLUMN category TEXT NOT NULL DEFAULT 'points'
  CHECK (category IN ('points', 'miles'));
```

Existing nullable fields (`emission_limit`, `limit_window_type`, `limit_window_days`, `limit_start_date`, `cooldown_days`) remain — they are simply `NULL` for points programs and required for miles programs.

Seed data uses `ON CONFLICT (tenant_id, slug) DO NOTHING` for idempotency.

Views created for convenience:

```sql
CREATE VIEW points_programs AS SELECT * FROM programs WHERE category = 'points';
CREATE VIEW miles_programs AS SELECT * FROM programs WHERE category = 'miles';
```

### Business Rules by Category

| Operation | Source | Destination |
|---|---|---|
| Entry (accumulate) | `points` or `miles` | — |
| Transfer | `points` only | `miles` only |
| Sale | `miles` only | — |
| Emission | `miles` only | — |

- **Transfers**: validate category server-side. If `from_program.category != 'points'` or `to_program.category != 'miles'`, return 422 with code `INVALID_TRANSFER_PROGRAM_CATEGORY`.
- **Emissions**: filter program list to `miles` only in the form. Server-side POST also validates category.
- **Sales**: filter to `miles` only in the form. Backend accepts both for flexibility, but form defaults to miles.
- **Entries**: default filter to `points` in the form, but allow `miles`.

### UI Changes

**Programs list:** new `category` column with a badge ("Pontos" / "Milhas").

**Program form:** radio/select for category; emission limit fields hidden unless `category = 'miles'`.

**Transfer form:** Origin select filtered to `points`; Destination select filtered to `miles`.

**Sale form:** Program select filtered to `miles`.

**Emission form:** Program select filtered to `miles`.

### Seed Data Update

Replace current dummy seed with real-world examples:

```sql
-- Points programs
INSERT INTO programs (tenant_id, name, slug, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Livelo', 'livelo', 'points'),
  ('00000000-0000-0000-0000-000000000001', 'Esfera', 'esfera', 'points'),
  ('00000000-0000-0000-0000-000000000001', 'Iupp (Itaú)', 'iupp', 'points')
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- Miles programs
INSERT INTO programs (tenant_id, name, slug, category, emission_limit, limit_window_type, limit_window_days, cooldown_days) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Latam Pass', 'latam', 'miles', 5, 'rolling', 365, 7),
  ('00000000-0000-0000-0000-000000000001', 'Smiles', 'smiles', 'miles', 5, 'rolling', 365, 7),
  ('00000000-0000-0000-0000-000000000001', 'TAP Miles&Go', 'tap', 'miles', 5, 'rolling', 365, 7),
  ('00000000-0000-0000-0000-000000000001', 'Azul Fidelidade', 'azul', 'miles', 5, 'rolling', 365, 7)
ON CONFLICT (tenant_id, slug) DO NOTHING;
```

### Files to Change

1. `supabase/migrations/002_category.sql` — ALTER TABLE + seed UPDATE/INSERT
2. `apps/web/src/types/index.ts` — add `category` to `Program`
3. `apps/web/src/lib/utils.ts` — `formatCategory` helper
4. `apps/web/src/app/programs/page.tsx` — category column in table
5. `apps/web/src/app/programs/new/page.tsx` — category field, conditional limit fields
6. `apps/web/src/app/programs/[id]/page.tsx` — same
7. `apps/web/src/app/api/entries/route.ts` — no change needed (entry accepts both)
8. `apps/web/src/app/api/transfers/route.ts` — validate category
9. `apps/web/src/app/api/sales/route.ts` — no change (backend accepts both)
10. `apps/web/src/app/api/emissions/route.ts` — validate category
11. `apps/web/src/app/api/emissions/check/route.ts` — validate category
12. `apps/web/src/app/transfers/new/page.tsx` — filter program selects by category
13. `apps/web/src/app/sales/new/page.tsx` — filter to miles
14. `apps/web/src/app/emissions/new/page.tsx` — filter to miles
15. `apps/web/src/components/tables/programs-table.tsx` — category column

### Not in Scope

- Transfer bonus ratios per partnership (future feature)
- Expiration tracking per program
- Automatic transfer tax calculator
