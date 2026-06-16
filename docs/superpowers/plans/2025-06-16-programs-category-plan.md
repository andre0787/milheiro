# Programs Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `category` field to programs to distinguish points programs (Livelo, Esfera) from miles programs (Latam, Smiles) with business rule validation.

**Architecture:** Single migration adds `category` column with CHECK constraint. API routes validate transfer/emission program categories server-side. Form selects filter programs by category per operation type.

**Tech Stack:** PostgreSQL, Next.js API routes, shadcn/ui Select

---

### Task 1: Migration 002_category.sql

**Files:**
- Create: `supabase/migrations/002_category.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 002_category.sql
-- Add category to programs (points vs miles)

ALTER TABLE programs ADD COLUMN category TEXT NOT NULL DEFAULT 'points'
  CHECK (category IN ('points', 'miles'));

-- Update existing rows (if any) — default 'points' handles them

-- Insert real-world seed data (idempotent)
INSERT INTO programs (tenant_id, name, slug, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Livelo', 'livelo', 'points'),
  ('00000000-0000-0000-0000-000000000001', 'Esfera', 'esfera', 'points'),
  ('00000000-0000-0000-0000-000000000001', 'Iupp (Itaú)', 'iupp', 'points')
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO programs (tenant_id, name, slug, category, emission_limit, limit_window_type, limit_window_days, cooldown_days) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Latam Pass', 'latam', 'miles', 5, 'rolling', 365, 7),
  ('00000000-0000-0000-0000-000000000001', 'Smiles', 'smiles', 'miles', 5, 'rolling', 365, 7),
  ('00000000-0000-0000-0000-000000000001', 'TAP Miles&Go', 'tap', 'miles', 5, 'rolling', 365, 7),
  ('00000000-0000-0000-0000-000000000001', 'Azul Fidelidade', 'azul', 'miles', 5, 'rolling', 365, 7)
ON CONFLICT (tenant_id, slug) DO NOTHING;
```

- [ ] **Step 2: Apply the migration (restart local supabase)**

Run:
```bash
pkill -f "next dev" 2>/dev/null
kill $(lsof -t -i:3000 2>/dev/null) 2>/dev/null
npx supabase db reset --workdir .
sleep 3
npx supabase start
```

Expected: migration applies without errors, seed data inserted.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_category.sql
git commit -m "feat: add category to programs (points vs miles)"
```

---

### Task 2: Update types and utils

**Files:**
- Modify: `apps/web/src/types/index.ts:8-19`
- Modify: `apps/web/src/lib/utils.ts:30`

- [ ] **Step 1: Add `category` to Program type**

In `apps/web/src/types/index.ts`, add `category` field:

```typescript
export interface Program {
  id: string
  tenant_id: string
  name: string
  slug: string
  category: 'points' | 'miles'
  emission_limit: number
  limit_window_type: 'rolling' | 'fixed' | 'none'
  limit_window_days: number
  limit_start_date: string | null
  cooldown_days: number
  created_at: string
}
```

- [ ] **Step 2: Add formatCategory helper**

In `apps/web/src/lib/utils.ts`, append:

```typescript
export function formatCategory(category: string): string {
  return category === 'points' ? 'Pontos' : 'Milhas'
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/index.ts apps/web/src/lib/utils.ts
git commit -m "feat: add category field to Program type and formatCategory helper"
```

---

### Task 3: Update Programs list and form

**Files:**
- Modify: `apps/web/src/components/tables/programs-table.tsx:8-12`
- Modify: `apps/web/src/components/forms/program-form.tsx` (category selector + conditional fields)

- [ ] **Step 1: Update ProgramsTable with category column**

Replace the emission_limit and limit_window_type columns with a category badge:

```typescript
import { formatCategory } from '@/lib/utils'

const columns: ColumnDef<Program>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'slug', header: 'Slug' },
  {
    accessorKey: 'category',
    header: 'Tipo',
    cell: ({ row }) => {
      const cat = row.original.category
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          cat === 'points' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {formatCategory(cat)}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/programs/${row.original.id}`} className="text-sm text-blue-600 hover:underline">
        Editar
      </Link>
    ),
  },
]
```

- [ ] **Step 2: Update ProgramForm with category selector and conditional fields**

Replace the entire form content:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProgramFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function ProgramForm({ initialData, onSubmit }: ProgramFormProps) {
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState(
    (initialData?.category as string) ?? 'points'
  )
  const [limitWindowType, setLimitWindowType] = useState(
    (initialData?.limit_window_type as string) ?? 'none'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const isMiles = category === 'miles'
    const data: Record<string, unknown> = {
      name: form.get('name'),
      slug: form.get('slug'),
      category,
      emission_limit: isMiles ? Number(form.get('emission_limit')) : 0,
      limit_window_type: isMiles ? limitWindowType : 'none',
      limit_window_days: isMiles && limitWindowType === 'rolling' ? Number(form.get('limit_window_days')) : 365,
      limit_start_date: isMiles && limitWindowType === 'fixed' ? (form.get('limit_start_date') || null) : null,
      cooldown_days: isMiles ? Number(form.get('cooldown_days')) : 0,
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={initialData?.name as string} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={initialData?.slug as string} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Tipo</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v as string); setLimitWindowType('none') }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Pontos</SelectItem>
                <SelectItem value="miles">Milhas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {category === 'miles' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="emission_limit">Limite de Emissões</Label>
                <Input id="emission_limit" name="emission_limit" type="number" defaultValue={initialData?.emission_limit as string ?? '5'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit_window_type">Tipo de Janela</Label>
                <Select value={limitWindowType} onValueChange={(value) => value && setLimitWindowType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="rolling">Rolling</SelectItem>
                    <SelectItem value="fixed">Fixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {limitWindowType === 'rolling' && (
                <div className="space-y-2">
                  <Label htmlFor="limit_window_days">Dias da Janela</Label>
                  <Input id="limit_window_days" name="limit_window_days" type="number" defaultValue={initialData?.limit_window_days as string ?? '365'} />
                </div>
              )}
              {limitWindowType === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="limit_start_date">Data de Início</Label>
                  <Input id="limit_start_date" name="limit_start_date" type="date" defaultValue={initialData?.limit_start_date as string} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cooldown_days">Carência (dias)</Label>
                <Input id="cooldown_days" name="cooldown_days" type="number" defaultValue={initialData?.cooldown_days as string ?? '0'} />
              </div>
            </>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/tables/programs-table.tsx apps/web/src/components/forms/program-form.tsx
git commit -m "feat: update programs list and form with category field"
```

---

### Task 4: Validate category in transfers and emissions API

**Files:**
- Modify: `apps/web/src/app/api/transfers/route.ts:14-19`
- Modify: `apps/web/src/app/api/emissions/route.ts:14-24`
- Modify: `apps/web/src/app/api/emissions/check/route.ts:14`

- [ ] **Step 1: Add category validation to transfers POST**

```typescript
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Validate program categories
  const { data: fromProgram } = await supabase
    .from('programs').select('category').eq('id', body.from_program_id).single()
  if (!fromProgram || fromProgram.category !== 'points') {
    return NextResponse.json(
      { data: null, error: 'INVALID_TRANSFER_PROGRAM_CATEGORY: Origem deve ser um programa de pontos' },
      { status: 422 }
    )
  }
  const { data: toProgram } = await supabase
    .from('programs').select('category').eq('id', body.to_program_id).single()
  if (!toProgram || toProgram.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_TRANSFER_PROGRAM_CATEGORY: Destino deve ser um programa de milhas' },
      { status: 422 }
    )
  }

  const { data, error } = await supabase.from('transfers').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 2: Add category validation to emissions POST**

Add after line 24 (`if (!program) ...`):

```typescript
  if (program.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_EMISSION_PROGRAM_CATEGORY: Emissões só podem ser registradas em programas de milhas' },
      { status: 422 }
    )
  }
```

- [ ] **Step 3: Add category validation to emissions/check GET**

Add after the initial program fetch (after `if (!program)` check):

```typescript
  if (program.category !== 'miles') {
    return NextResponse.json(
      { data: null, error: 'INVALID_EMISSION_PROGRAM_CATEGORY: Program is not a miles program' },
      { status: 422 }
    )
  }
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/transfers/route.ts apps/web/src/app/api/emissions/route.ts apps/web/src/app/api/emissions/check/route.ts
git commit -m "feat: validate program category in transfers and emissions API"
```

---

### Task 5: Filter program selects by category in forms

**Files:**
- Modify: `apps/web/src/components/forms/transfer-form.tsx:23,29,60-78`
- Modify: `apps/web/src/components/forms/sale-form.tsx:24,36,77-84`
- Modify: `apps/web/src/components/forms/emission-form.tsx:23,31,67-75`

- [ ] **Step 1: Update TransferForm — filter origin to points, destination to miles**

Changes:
- Load two separate filtered lists: `pointsPrograms` and `milesPrograms`
- Origin select only shows points programs
- Destination select only shows miles programs

```typescript
const pointsPrograms = programs.filter(p => p.category === 'points')
const milesPrograms = programs.filter(p => p.category === 'miles')
```

Then in the JSX:
```tsx
<Select name="from_program_id" required>
  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
  <SelectContent>
    {pointsPrograms.map((p) => (
      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

```tsx
<Select name="to_program_id" required>
  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
  <SelectContent>
    {milesPrograms.map((p) => (
      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 2: Update SaleForm — filter to miles programs**

Change:
```typescript
const milesPrograms = programs.filter(p => p.category === 'miles')
```

And in JSX:
```tsx
{programs.filter(p => p.category === 'miles').map((p) => ( ... ))}
```

- [ ] **Step 3: Update EmissionForm — filter to miles programs**

Same pattern — filter programs to `category === 'miles'`.

```typescript
const milesPrograms = programs.filter(p => p.category === 'miles')
```

```tsx
{milesPrograms.map((p) => ( ... ))}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/forms/transfer-form.tsx apps/web/src/components/forms/sale-form.tsx apps/web/src/components/forms/emission-form.tsx
git commit -m "feat: filter program selects by category in forms"
```

---

### Task 6: Verify everything compiles and pages load

**Files:**
- All modified files

- [ ] **Step 1: Restart dev server and test all routes**

```bash
kill $(lsof -t -i:3000 2>/dev/null) 2>/dev/null; sleep 1
rm -f /tmp/milheiro-dev.log
nohup npx next dev -p 3000 > /tmp/milheiro-dev.log 2>&1 &
sleep 5
for path in / /programs /holders /cpfs /entries /transfers /sales /emissions /programs/new /transfers/new /sales/new /emissions/new; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$path") $path"
done
```

Expected: all return HTTP 200.

- [ ] **Step 2: Check logs for errors**

```bash
grep -i "error\|warn" /tmp/milheiro-dev.log | head -10
```

Expected: no errors.
