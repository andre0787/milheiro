# Milheiro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MVP of Milheiro — a personal miles/points manager with weighted average CPM calculation, transfer tracking, sales with PnL, and emission limit control.

**Architecture:** Next.js 14 App Router monolith with Tailwind CSS + shadcn/ui. Business logic (CPM weighted average) lives in PostgreSQL triggers for ACID consistency. Supabase provides database, future auth, and file storage. Deployed on Vercel (free) + Supabase (free).

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, TanStack Table, Supabase (PostgreSQL), Vercel

---

### Task 1: Project Scaffold + Dependencies

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/.env.local.example`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `package.json` (root)
- Create: `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /home/andreluiz0787/repos/milheiro
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

- [ ] **Step 2: Install dependencies**

```bash
cd /home/andreluiz0787/repos/milheiro/apps/web
npm install @tanstack/react-table date-fns lucide-react zod @supabase/supabase-js @supabase/ssr clsx tailwind-merge
npx shadcn@latest init -y --base-color zinc --radius 0.5
npx shadcn@latest add button card input label select table dialog form toast sheet sonner -y
```

- [ ] **Step 3: Create root package.json and .gitignore**

Root `package.json`:
```json
{
  "name": "milheiro",
  "private": true,
  "scripts": {
    "dev": "cd apps/web && npm run dev",
    "build": "cd apps/web && npm run build",
    "start": "cd apps/web && npm run start"
  }
}
```

`.gitignore`:
```
node_modules/
.next/
.env.local
.env*.local
dist/
```

- [ ] **Step 4: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd /home/andreluiz0787/repos/milheiro
npm run dev
```
Expected: Next.js starts on port 3000.

- [ ] **Step 6: Commit**

```bash
cd /home/andreluiz0787/repos/milheiro && git init && git add -A && git commit -m "chore: scaffold Next.js project with Tailwind and shadcn/ui"
```

---

### Task 2: Supabase Schema + CPM Triggers

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Write the full schema migration**

`supabase/migrations/001_schema.sql`:

```sql
-- 001_schema.sql
-- Milheiro: complete schema with CPM weighted average triggers

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants (prep for future multi-tenant)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tenant for MVP
INSERT INTO tenants (id, name, slug) VALUES (gen_random_uuid(), 'Meu Uso Pessoal', 'me');

-- Programs (loyalty programs, configurable)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  emission_limit INT DEFAULT 0,
  limit_window_type TEXT CHECK (limit_window_type IN ('rolling', 'fixed', 'none')) DEFAULT 'none',
  limit_window_days INT DEFAULT 365,
  limit_start_date DATE,
  cooldown_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Holders (account holders)
CREATE TABLE holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  name TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operation types (categories for entries)
CREATE TABLE operation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_purchase BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, slug)
);

-- Insert default operation types
INSERT INTO operation_types (name, slug, is_purchase) VALUES
  ('Clube de Assinatura', 'clube', TRUE),
  ('Compra com Desconto', 'compra-desconto', TRUE),
  ('Transferência de Carrinho', 'transf-carrinho', FALSE),
  ('Bônus Promocional', 'bonus', FALSE),
  ('Compra de Pontos', 'compra-pontos', TRUE);

-- Entries (purchases/accumulations)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  program_id UUID NOT NULL REFERENCES programs(id),
  holder_id UUID NOT NULL REFERENCES holders(id),
  operation_type_id UUID REFERENCES operation_types(id),
  date DATE NOT NULL,
  points INT NOT NULL CHECK (points > 0),
  cost DECIMAL(12,2) NOT NULL CHECK (cost >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfers (between programs)
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  from_program_id UUID NOT NULL REFERENCES programs(id),
  to_program_id UUID NOT NULL REFERENCES programs(id),
  holder_id UUID NOT NULL REFERENCES holders(id),
  date DATE NOT NULL,
  points_sent INT NOT NULL CHECK (points_sent > 0),
  bonus_pct DECIMAL(5,2) DEFAULT 0,
  points_received INT NOT NULL CHECK (points_received > 0),
  transfer_fee DECIMAL(12,2) DEFAULT 0 CHECK (transfer_fee >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  program_id UUID NOT NULL REFERENCES programs(id),
  holder_id UUID NOT NULL REFERENCES holders(id),
  date DATE NOT NULL,
  points_sold INT NOT NULL CHECK (points_sold > 0),
  sale_value DECIMAL(12,2) NOT NULL CHECK (sale_value >= 0),
  buyer TEXT,
  expected_receipt_date DATE,
  profit_auto DECIMAL(12,2),
  profit_override DECIMAL(12,2),
  profit_final DECIMAL(12,2),
  cpm_at_sale DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CPFs
CREATE TABLE cpfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emissions (ticket issuances)
CREATE TABLE emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  program_id UUID NOT NULL REFERENCES programs(id),
  cpf_id UUID NOT NULL REFERENCES cpfs(id),
  holder_id UUID NOT NULL REFERENCES holders(id),
  issued_at DATE NOT NULL,
  ticket_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balances (materialized via triggers)
CREATE TABLE balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  program_id UUID NOT NULL REFERENCES programs(id),
  holder_id UUID NOT NULL REFERENCES holders(id),
  total_points INT NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  cpm DECIMAL(12,2) GENERATED ALWAYS AS (
    CASE WHEN total_points > 0
      THEN ROUND((total_cost / total_points) * 1000, 2)
      ELSE 0
    END
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, program_id, holder_id)
);

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

-- Function: update balance on entry insert
CREATE OR REPLACE FUNCTION fn_entry_upsert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO balances (tenant_id, program_id, holder_id, total_points, total_cost)
  VALUES (NEW.tenant_id, NEW.program_id, NEW.holder_id, NEW.points, NEW.cost)
  ON CONFLICT (tenant_id, program_id, holder_id)
  DO UPDATE SET
    total_points = balances.total_points + NEW.points,
    total_cost = balances.total_cost + NEW.cost,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_upsert
  AFTER INSERT ON entries
  FOR EACH ROW
  EXECUTE FUNCTION fn_entry_upsert();

-- Function: revert balance on entry delete
CREATE OR REPLACE FUNCTION fn_entry_delete()
RETURNS TRIGGER AS $$
DECLARE
  current_balance RECORD;
  new_points INT;
  new_cost DECIMAL(12,2);
BEGIN
  SELECT * INTO current_balance FROM balances
  WHERE tenant_id = OLD.tenant_id AND program_id = OLD.program_id AND holder_id = OLD.holder_id;

  IF current_balance.total_points < OLD.points THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Cannot delete entry, balance would go negative';
  END IF;

  new_points := current_balance.total_points - OLD.points;
  new_cost := current_balance.total_cost - OLD.cost;

  IF new_points = 0 THEN
    DELETE FROM balances WHERE id = current_balance.id;
  ELSE
    UPDATE balances SET
      total_points = new_points,
      total_cost = new_cost,
      updated_at = NOW()
    WHERE id = current_balance.id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_delete
  AFTER DELETE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION fn_entry_delete();

-- Function: update balance on sale insert (debit + auto profit)
CREATE OR REPLACE FUNCTION fn_sale_upsert()
RETURNS TRIGGER AS $$
DECLARE
  current_balance RECORD;
  cost_per_point DECIMAL(12,6);
  sale_cost DECIMAL(12,2);
BEGIN
  SELECT * INTO current_balance FROM balances
  WHERE tenant_id = NEW.tenant_id AND program_id = NEW.program_id AND holder_id = NEW.holder_id
  FOR UPDATE;

  IF current_balance.total_points < NEW.points_sold THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Not enough points to sell. Available: %, requested: %',
      current_balance.total_points, NEW.points_sold;
  END IF;

  cost_per_point := current_balance.total_cost / NULLIF(current_balance.total_points, 0);
  sale_cost := ROUND(NEW.points_sold * cost_per_point, 2);
  NEW.cpm_at_sale := ROUND(cost_per_point * 1000, 2);
  NEW.profit_auto := NEW.sale_value - sale_cost;
  NEW.profit_final := COALESCE(NEW.profit_override, NEW.profit_auto);

  UPDATE balances SET
    total_points = total_points - NEW.points_sold,
    total_cost = ROUND(total_cost - sale_cost, 2),
    updated_at = NOW()
  WHERE id = current_balance.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_upsert
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION fn_sale_upsert();

-- Function: revert balance on sale delete
CREATE OR REPLACE FUNCTION fn_sale_delete()
RETURNS TRIGGER AS $$
DECLARE
  cost_per_point_at_sale DECIMAL(12,6);
BEGIN
  cost_per_point_at_sale := OLD.cpm_at_sale / 1000.0;

  INSERT INTO balances (tenant_id, program_id, holder_id, total_points, total_cost)
  VALUES (OLD.tenant_id, OLD.program_id, OLD.holder_id, OLD.points_sold, ROUND(OLD.points_sold * cost_per_point_at_sale, 2))
  ON CONFLICT (tenant_id, program_id, holder_id)
  DO UPDATE SET
    total_points = balances.total_points + OLD.points_sold,
    total_cost = ROUND(balances.total_cost + (OLD.points_sold * cost_per_point_at_sale), 2),
    updated_at = NOW();

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_delete
  AFTER DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION fn_sale_delete();

-- Function: update balance on transfer insert
CREATE OR REPLACE FUNCTION fn_transfer_upsert()
RETURNS TRIGGER AS $$
DECLARE
  from_balance RECORD;
  to_balance RECORD;
  cost_per_point DECIMAL(12,6);
  debit_cost DECIMAL(12,2);
BEGIN
  -- Lock and debit from source
  SELECT * INTO from_balance FROM balances
  WHERE tenant_id = NEW.tenant_id AND program_id = NEW.from_program_id AND holder_id = NEW.holder_id
  FOR UPDATE;

  IF from_balance.total_points < NEW.points_sent THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Not enough points in source. Available: %, requested: %',
      from_balance.total_points, NEW.points_sent;
  END IF;

  cost_per_point := from_balance.total_cost / NULLIF(from_balance.total_points, 0);
  debit_cost := ROUND(NEW.points_sent * cost_per_point, 2);

  UPDATE balances SET
    total_points = total_points - NEW.points_sent,
    total_cost = ROUND(total_cost - debit_cost, 2),
    updated_at = NOW()
  WHERE id = from_balance.id;

  -- Credit to destination (points_received already includes bonus)
  INSERT INTO balances (tenant_id, program_id, holder_id, total_points, total_cost)
  VALUES (NEW.tenant_id, NEW.to_program_id, NEW.holder_id, NEW.points_received, debit_cost + NEW.transfer_fee)
  ON CONFLICT (tenant_id, program_id, holder_id)
  DO UPDATE SET
    total_points = balances.total_points + NEW.points_received,
    total_cost = ROUND(balances.total_cost + debit_cost + NEW.transfer_fee, 2),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transfer_upsert
  BEFORE INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION fn_transfer_upsert();

-- Function: revert transfer on delete
CREATE OR REPLACE FUNCTION fn_transfer_delete()
RETURNS TRIGGER AS $$
DECLARE
  from_balance RECORD;
  to_balance RECORD;
  cost_per_point_at_transfer DECIMAL(12,6);
  original_points_from_origin INT;
  original_cost_from_origin DECIMAL(12,2);
  transfer_cost DECIMAL(12,2);
BEGIN
  -- Revert destination: remove the points_received and the cost that was added
  SELECT * INTO to_balance FROM balances
  WHERE tenant_id = OLD.tenant_id AND program_id = OLD.to_program_id AND holder_id = OLD.holder_id;

  transfer_cost := OLD.points_received * (to_balance.total_cost / NULLIF(to_balance.total_points, 0));

  UPDATE balances SET
    total_points = total_points - OLD.points_received,
    total_cost = ROUND(total_cost - transfer_cost, 2),
    updated_at = NOW()
  WHERE id = to_balance.id;

  -- Revert origin: return the points_sent with original CPM
  cost_per_point_at_transfer := 0;
  SELECT total_cost / NULLIF(total_points, 0) INTO cost_per_point_at_transfer
  FROM balances WHERE id = to_balance.id;

  INSERT INTO balances (tenant_id, program_id, holder_id, total_points, total_cost)
  VALUES (OLD.tenant_id, OLD.from_program_id, OLD.holder_id, OLD.points_sent, ROUND(OLD.points_sent * cost_per_point_at_transfer, 2))
  ON CONFLICT (tenant_id, program_id, holder_id)
  DO UPDATE SET
    total_points = balances.total_points + OLD.points_sent,
    total_cost = ROUND(balances.total_cost + (OLD.points_sent * cost_per_point_at_transfer), 2),
    updated_at = NOW();

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transfer_delete
  AFTER DELETE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION fn_transfer_delete();
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
# Option A: Run in Supabase SQL Editor (paste the file content)
# Option B: Use Supabase CLI
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

- [ ] **Step 3: Verify schema**

```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```
Expected: tenants, programs, holders, operation_types, entries, transfers, sales, cpfs, emissions, balances.

- [ ] **Step 4: Commit**

```bash
git add supabase/ && git commit -m "feat: add database schema with CPM weighted average triggers"
```

---

### Task 3: Supabase Client + Types

**Files:**
- Create: `apps/web/src/lib/supabase/client.ts`
- Create: `apps/web/src/lib/supabase/server.ts`
- Create: `apps/web/src/types/index.ts`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/.env.local` (with real values)

- [ ] **Step 1: Create Supabase browser client**

`apps/web/src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create Supabase server client**

`apps/web/src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}
```

- [ ] **Step 3: Create TypeScript types**

`apps/web/src/types/index.ts`:
```typescript
export interface Tenant {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Program {
  id: string
  tenant_id: string
  name: string
  slug: string
  emission_limit: number
  limit_window_type: 'rolling' | 'fixed' | 'none'
  limit_window_days: number
  limit_start_date: string | null
  cooldown_days: number
  created_at: string
}

export interface Holder {
  id: string
  tenant_id: string
  name: string
  nickname: string | null
  created_at: string
}

export interface OperationType {
  id: string
  tenant_id: string
  name: string
  slug: string
  is_purchase: boolean
}

export interface Entry {
  id: string
  tenant_id: string
  program_id: string
  holder_id: string
  operation_type_id: string | null
  date: string
  points: number
  cost: number
  notes: string | null
  created_at: string
  // Joined
  program_name?: string
  holder_name?: string
  operation_type_name?: string
}

export interface Transfer {
  id: string
  tenant_id: string
  from_program_id: string
  to_program_id: string
  holder_id: string
  date: string
  points_sent: number
  bonus_pct: number
  points_received: number
  transfer_fee: number
  notes: string | null
  created_at: string
  from_program_name?: string
  to_program_name?: string
  holder_name?: string
}

export interface Sale {
  id: string
  tenant_id: string
  program_id: string
  holder_id: string
  date: string
  points_sold: number
  sale_value: number
  buyer: string | null
  expected_receipt_date: string | null
  profit_auto: number | null
  profit_override: number | null
  profit_final: number | null
  cpm_at_sale: number | null
  notes: string | null
  created_at: string
  program_name?: string
  holder_name?: string
}

export interface Cpf {
  id: string
  tenant_id: string
  name: string
  document: string
  created_at: string
}

export interface Emission {
  id: string
  tenant_id: string
  program_id: string
  cpf_id: string
  holder_id: string
  issued_at: string
  ticket_info: string | null
  created_at: string
  program_name?: string
  cpf_name?: string
  cpf_document?: string
  holder_name?: string
}

export interface Balance {
  id: string
  tenant_id: string
  program_id: string
  holder_id: string
  total_points: number
  total_cost: number
  cpm: number
  updated_at: string
  program_name?: string
  holder_name?: string
}

export interface DashboardSummary {
  mes: string
  programa: string
  titular: string
  custo_entradas: number
  pts_entradas: number
  receita_vendas: number
  custo_vendas: number
  taxas_transf: number
  pnl_liquido: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface EmissionCheck {
  available: boolean
  used: number
  limit: number
  cooldown_remaining: number | null
}
```

- [ ] **Step 4: Create utils**

`apps/web/src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatCpm(value: number): string {
  return `R$ ${value.toFixed(2)}/mil`
}

export function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-BR')
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/types/ && git commit -m "feat: add Supabase client setup, types, and utils"
```

---

### Task 4: Root Layout + Navigation

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`

- [ ] **Step 1: Write global CSS**

`apps/web/src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Write root layout with sidebar navigation**

`apps/web/src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Milheiro',
  description: 'Gerenciador de Pontos e Milhas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Write Sidebar component**

`apps/web/src/components/sidebar.tsx`:
```tsx
import Link from 'next/link'

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/entries', label: 'Entradas', icon: '📥' },
  { href: '/transfers', label: 'Transferências', icon: '🔄' },
  { href: '/sales', label: 'Vendas', icon: '💰' },
  { href: '/emissions', label: 'Emissões', icon: '🎫' },
  { href: '/holders', label: 'Titulares', icon: '👤' },
  { href: '/programs', label: 'Programas', icon: '🏪' },
  { href: '/cpfs', label: 'CPFs', icon: '🪪' },
]

export function Sidebar() {
  return (
    <aside className="w-60 border-r bg-muted/30 p-4 flex flex-col gap-1">
      <div className="text-lg font-bold mb-6 px-2">Milheiro</div>
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
    </aside>
  )
}
```

- [ ] **Step 4: Write placeholder dashboard page**

`apps/web/src/app/page.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: balances } = await supabase
    .from('balances')
    .select('*, programs:program_id(name), holders:holder_id(name)')

  const totalPoints = balances?.reduce((sum, b) => sum + b.total_points, 0) ?? 0
  const totalCost = balances?.reduce((sum, b) => sum + Number(b.total_cost), 0) ?? 0
  const avgCpm = totalPoints > 0 ? (totalCost / totalPoints) * 1000 : 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">pontos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">investido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPM Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {avgCpm.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">por milheiro</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balances?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">com saldo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/ apps/web/src/components/ && git commit -m "feat: add layout with sidebar navigation and dashboard page"
```

---

### Task 5: Programs CRUD

**Files:**
- Create: `apps/web/src/app/api/programs/route.ts`
- Create: `apps/web/src/app/api/programs/[id]/route.ts`
- Create: `apps/web/src/app/programs/page.tsx`
- Create: `apps/web/src/app/programs/new/page.tsx`
- Create: `apps/web/src/app/programs/[id]/page.tsx`
- Create: `apps/web/src/components/data-table/data-table.tsx`

- [ ] **Step 1: Write generic DataTable component**

`apps/web/src/components/data-table/data-table.tsx`:
```tsx
'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próximo
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write programs list API**

`apps/web/src/app/api/programs/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('programs').select('*').order('name')
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('programs').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 3: Write programs detail API**

`apps/web/src/app/api/programs/[id]/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('programs').select().eq('id', id).single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('programs').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
```

- [ ] **Step 4: Write programs list page**

`apps/web/src/app/programs/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Program } from '@/types'

const columns: ColumnDef<Program>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'emission_limit', header: 'Limite Emissão' },
  { accessorKey: 'limit_window_type', header: 'Janela' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/programs/${row.original.id}`} className="text-sm text-blue-600 hover:underline">
        Editar
      </Link>
    ),
  },
]

export default async function ProgramsPage() {
  const supabase = await createClient()
  const { data: programs } = await supabase.from('programs').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Programas</h1>
        <Button asChild><Link href="/programs/new">Novo Programa</Link></Button>
      </div>
      <DataTable columns={columns} data={programs ?? []} />
    </div>
  )
}
```

- [ ] **Step 5: Write program form page**

`apps/web/src/app/programs/new/page.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ProgramForm } from '@/components/forms/program-form'

export default function NewProgramPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Programa criado!')
      router.push('/programs')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Novo Programa</h1>
      <ProgramForm onSubmit={handleSubmit} />
    </div>
  )
}
```

- [ ] **Step 6: Write ProgramForm component**

`apps/web/src/components/forms/program-form.tsx`:
```tsx
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
  const [limitWindowType, setLimitWindowType] = useState(
    (initialData?.limit_window_type as string) ?? 'none'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      name: form.get('name'),
      slug: form.get('slug'),
      emission_limit: Number(form.get('emission_limit')),
      limit_window_type: limitWindowType,
      limit_window_days: Number(form.get('limit_window_days')),
      limit_start_date: form.get('limit_start_date') || null,
      cooldown_days: Number(form.get('cooldown_days')),
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
            <Label htmlFor="emission_limit">Limite de Emissões</Label>
            <Input id="emission_limit" name="emission_limit" type="number" defaultValue={initialData?.emission_limit as string ?? '0'} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limit_window_type">Tipo de Janela</Label>
            <Select value={limitWindowType} onValueChange={setLimitWindowType}>
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
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/programs/ apps/web/src/app/programs/ apps/web/src/components/data-table/ apps/web/src/components/forms/ && git commit -m "feat: add programs CRUD with API routes and form"
```

---

### Task 6: Holders + CPFs CRUD

**Files:**
- Create: `apps/web/src/app/api/holders/route.ts`
- Create: `apps/web/src/app/api/holders/[id]/route.ts`
- Create: `apps/web/src/app/holders/page.tsx`
- Create: `apps/web/src/app/holders/new/page.tsx`
- Create: `apps/web/src/app/api/cpfs/route.ts`
- Create: `apps/web/src/app/api/cpfs/[id]/route.ts`
- Create: `apps/web/src/app/cpfs/page.tsx`
- Create: `apps/web/src/app/cpfs/new/page.tsx`
- Create: `apps/web/src/components/forms/holder-form.tsx`
- Create: `apps/web/src/components/forms/cpf-form.tsx`

- [ ] **Step 1: Write API routes for holders**

`apps/web/src/app/api/holders/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('holders').select('*').order('name')
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('holders').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

`apps/web/src/app/api/holders/[id]/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('holders').select().eq('id', id).single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('holders').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('holders').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
```

- [ ] **Step 2: Write holders list page**

`apps/web/src/app/holders/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Holder } from '@/types'

const columns: ColumnDef<Holder>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'nickname', header: 'Apelido' },
  { accessorKey: 'created_at', header: 'Criado em' },
]

export default async function HoldersPage() {
  const supabase = await createClient()
  const { data: holders } = await supabase.from('holders').select('*').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Titulares</h1>
        <Button asChild><Link href="/holders/new">Novo Titular</Link></Button>
      </div>
      <DataTable columns={columns} data={holders ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: Write holder form + new page**

`apps/web/src/components/forms/holder-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface HolderFormProps {
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function HolderForm({ initialData, onSubmit }: HolderFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get('name'),
      nickname: form.get('nickname') || null,
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
            <Label htmlFor="nickname">Apelido</Label>
            <Input id="nickname" name="nickname" defaultValue={initialData?.nickname as string} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

`apps/web/src/app/holders/new/page.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { HolderForm } from '@/components/forms/holder-form'

export default function NewHolderPage() {
  const router = useRouter()

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch('/api/holders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error)
    } else {
      toast.success('Titular criado!')
      router.push('/holders')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Novo Titular</h1>
      <HolderForm onSubmit={handleSubmit} />
    </div>
  )
}
```

- [ ] **Step 4: Write API + pages for CPFs**

Pattern identical to holders. Create:

`apps/web/src/app/api/cpfs/route.ts`
`apps/web/src/app/api/cpfs/[id]/route.ts`
`apps/web/src/app/cpfs/page.tsx`
`apps/web/src/app/cpfs/new/page.tsx`
`apps/web/src/components/forms/cpf-form.tsx`

(Use same pattern as holders, with fields: name, document)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/holders/ apps/web/src/app/holders/ apps/web/src/app/api/cpfs/ apps/web/src/app/cpfs/ apps/web/src/components/forms/holder-form.tsx apps/web/src/components/forms/cpf-form.tsx && git commit -m "feat: add holders and CPFs CRUD"
```

---

### Task 7: Entries CRUD

**Files:**
- Create: `apps/web/src/app/api/entries/route.ts`
- Create: `apps/web/src/app/api/entries/[id]/route.ts`
- Create: `apps/web/src/app/entries/page.tsx`
- Create: `apps/web/src/app/entries/new/page.tsx`
- Create: `apps/web/src/components/forms/entry-form.tsx`

- [ ] **Step 1: Write entries list API**

`apps/web/src/app/api/entries/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const entrySchema = z.object({
  program_id: z.string().uuid(),
  holder_id: z.string().uuid(),
  operation_type_id: z.string().uuid().nullable().optional(),
  date: z.string(),
  points: z.number().int().positive(),
  cost: z.number().min(0),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*, programs:program_id(name), holders:holder_id(name), operation_types:operation_type_id(name)')
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const parsed = entrySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.message }, { status: 400 })
  const { data, error } = await supabase.from('entries').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 2: Write entries detail API**

`apps/web/src/app/api/entries/[id]/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('entries').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
```

- [ ] **Step 3: Write entries list page**

`apps/web/src/app/entries/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Entry } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

const columns: ColumnDef<Entry>[] = [
  { accessorKey: 'date', header: 'Data', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'holder_name', header: 'Titular' },
  { accessorKey: 'points', header: 'Pontos', cell: ({ row }) => formatNumber(row.original.points) },
  { accessorKey: 'cost', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.cost) },
]

export default async function EntriesPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('entries')
    .select('*, programs:program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped = (entries ?? []).map((e) => ({
    ...e,
    program_name: (e.programs as { name: string } | null)?.name ?? '-',
    holder_name: (e.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Entradas</h1>
        <Button asChild><Link href="/entries/new">Nova Entrada</Link></Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
```

- [ ] **Step 4: Write entry form + new page**

`apps/web/src/components/forms/entry-form.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
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
import { Program, Holder, OperationType } from '@/types'

interface EntryFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function EntryForm({ onSubmit }: EntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [opTypes, setOpTypes] = useState<OperationType[]>([])

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
    fetch('/api/operation-types').then(r => r.json()).then(d => setOpTypes(d.data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      program_id: form.get('program_id'),
      holder_id: form.get('holder_id'),
      operation_type_id: form.get('operation_type_id') || null,
      date: form.get('date'),
      points: Number(form.get('points')),
      cost: Number(form.get('cost')),
      notes: form.get('notes') || null,
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program_id">Programa</Label>
            <Select name="program_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_id">Titular</Label>
            <Select name="holder_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="operation_type_id">Tipo de Operação</Label>
            <Select name="operation_type_id">
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {opTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="points">Quantidade de Pontos</Label>
            <Input id="points" name="points" type="number" min="1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Valor Pago (R$)</Label>
            <Input id="cost" name="cost" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" name="notes" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Write operation-types API (needed for form dropdown)**

`apps/web/src/app/api/operation-types/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('operation_types').select('*').order('name')
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/entries/ apps/web/src/app/entries/ apps/web/src/app/api/operation-types/ && git commit -m "feat: add entries CRUD with CPM trigger"
```

---

### Task 8: Transfers CRUD

**Files:**
- Create: `apps/web/src/app/api/transfers/route.ts`
- Create: `apps/web/src/app/api/transfers/[id]/route.ts`
- Create: `apps/web/src/app/transfers/page.tsx`
- Create: `apps/web/src/app/transfers/new/page.tsx`
- Create: `apps/web/src/components/forms/transfer-form.tsx`

- [ ] **Step 1: Write transfers API**

`apps/web/src/app/api/transfers/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transfers')
    .select('*, from_programs:from_program_id(name), to_programs:to_program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('transfers').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

`apps/web/src/app/api/transfers/[id]/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('transfers').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
```

- [ ] **Step 2: Write transfers list page**

`apps/web/src/app/transfers/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Transfer } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

const columns: ColumnDef<Transfer>[] = [
  { accessorKey: 'date', header: 'Data' },
  { accessorKey: 'from_program_name', header: 'Origem' },
  { accessorKey: 'to_program_name', header: 'Destino' },
  { accessorKey: 'points_sent', header: 'Enviados', cell: ({ row }) => formatNumber(row.original.points_sent) },
  { accessorKey: 'points_received', header: 'Recebidos', cell: ({ row }) => formatNumber(row.original.points_received) },
  { accessorKey: 'transfer_fee', header: 'Taxa', cell: ({ row }) => formatCurrency(row.original.transfer_fee) },
]

export default async function TransfersPage() {
  const supabase = await createClient()
  const { data: transfers } = await supabase
    .from('transfers')
    .select('*, from_programs:from_program_id(name), to_programs:to_program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped = (transfers ?? []).map((t) => ({
    ...t,
    from_program_name: (t.from_programs as { name: string } | null)?.name ?? '-',
    to_program_name: (t.to_programs as { name: string } | null)?.name ?? '-',
    holder_name: (t.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transferências</h1>
        <Button asChild><Link href="/transfers/new">Nova Transferência</Link></Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
```

- [ ] **Step 3: Write transfer form**

`apps/web/src/components/forms/transfer-form.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
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
import { Program, Holder } from '@/types'

interface TransferFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function TransferForm({ onSubmit }: TransferFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [pointsSent, setPointsSent] = useState(0)
  const [bonusPct, setBonusPct] = useState(0)

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
  }, [])

  const pointsReceived = Math.floor(pointsSent * (1 + bonusPct / 100))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      from_program_id: form.get('from_program_id'),
      to_program_id: form.get('to_program_id'),
      holder_id: form.get('holder_id'),
      date: form.get('date'),
      points_sent: Number(form.get('points_sent')),
      bonus_pct: Number(form.get('bonus_pct')),
      points_received: pointsReceived,
      transfer_fee: Number(form.get('transfer_fee')),
      notes: form.get('notes') || null,
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from_program_id">Programa de Origem</Label>
            <Select name="from_program_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="to_program_id">Programa de Destino</Label>
            <Select name="to_program_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_id">Titular</Label>
            <Select name="holder_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points_sent">Pontos Enviados</Label>
              <Input id="points_sent" name="points_sent" type="number" min="1" required
                onChange={(e) => setPointsSent(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_pct">Bônus (%)</Label>
              <Input id="bonus_pct" name="bonus_pct" type="number" step="0.01" min="0"
                onChange={(e) => setBonusPct(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Recebidos</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                {pointsReceived.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer_fee">Taxa de Transferência (R$)</Label>
            <Input id="transfer_fee" name="transfer_fee" type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" name="notes" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/transfers/ apps/web/src/app/transfers/ && git commit -m "feat: add transfers CRUD with dual CPM trigger"
```

---

### Task 9: Sales CRUD

**Files:**
- Create: `apps/web/src/app/api/sales/route.ts`
- Create: `apps/web/src/app/api/sales/[id]/route.ts`
- Create: `apps/web/src/app/sales/page.tsx`
- Create: `apps/web/src/app/sales/new/page.tsx`
- Create: `apps/web/src/components/forms/sale-form.tsx`

- [ ] **Step 1: Write sales API**

`apps/web/src/app/api/sales/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select('*, programs:program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('sales').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

`apps/web/src/app/api/sales/[id]/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase.from('sales').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('sales').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
```

- [ ] **Step 2: Write sales list page**

`apps/web/src/app/sales/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Sale } from '@/types'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

const columns: ColumnDef<Sale>[] = [
  { accessorKey: 'date', header: 'Data', cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'points_sold', header: 'Pontos', cell: ({ row }) => formatNumber(row.original.points_sold) },
  { accessorKey: 'sale_value', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.sale_value) },
  {
    accessorKey: 'profit_final',
    header: 'Lucro',
    cell: ({ row }) => {
      const val = row.original.profit_final
      if (val === null) return '-'
      return <span className={val >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(val)}</span>
    },
  },
]

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: sales } = await supabase
    .from('sales')
    .select('*, programs:program_id(name), holders:holder_id(name)')
    .order('date', { ascending: false })

  const mapped = (sales ?? []).map((s) => ({
    ...s,
    program_name: (s.programs as { name: string } | null)?.name ?? '-',
    holder_name: (s.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vendas</h1>
        <Button asChild><Link href="/sales/new">Nova Venda</Link></Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
```

- [ ] **Step 3: Write sale form with auto-CPM + override**

`apps/web/src/components/forms/sale-form.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
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
import { Program, Holder } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SaleFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function SaleForm({ onSubmit }: SaleFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedHolderId, setSelectedHolderId] = useState('')
  const [pointsSold, setPointsSold] = useState(0)
  const [saleValue, setSaleValue] = useState(0)
  const [currentCpm, setCurrentCpm] = useState(0)
  const [autoProfit, setAutoProfit] = useState<number | null>(null)
  const [overrideProfit, setOverrideProfit] = useState('')

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
  }, [])

  useEffect(() => {
    if (selectedProgramId && selectedHolderId) {
      fetch(`/api/balances?program_id=${selectedProgramId}&holder_id=${selectedHolderId}`)
        .then(r => r.json())
        .then(d => {
          if (d.data && d.data.length > 0) {
            setCurrentCpm(d.data[0].cpm)
          }
        })
    }
  }, [selectedProgramId, selectedHolderId])

  useEffect(() => {
    if (pointsSold > 0 && currentCpm > 0) {
      const cost = (pointsSold * currentCpm) / 1000
      setAutoProfit(saleValue - cost)
    } else {
      setAutoProfit(null)
    }
  }, [pointsSold, saleValue, currentCpm])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      program_id: form.get('program_id'),
      holder_id: form.get('holder_id'),
      date: form.get('date'),
      points_sold: Number(form.get('points_sold')),
      sale_value: Number(form.get('sale_value')),
      buyer: form.get('buyer') || null,
      expected_receipt_date: form.get('expected_receipt_date') || null,
      profit_override: overrideProfit ? Number(overrideProfit) : null,
      notes: form.get('notes') || null,
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program_id">Programa</Label>
            <Select name="program_id" required onValueChange={setSelectedProgramId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_id">Titular</Label>
            <Select name="holder_id" required onValueChange={setSelectedHolderId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data da Venda</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points_sold">Pontos Vendidos</Label>
              <Input id="points_sold" name="points_sold" type="number" min="1" required
                onChange={(e) => setPointsSold(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_value">Valor da Venda (R$)</Label>
              <Input id="sale_value" name="sale_value" type="number" step="0.01" min="0" required
                onChange={(e) => setSaleValue(Number(e.target.value))} />
            </div>
          </div>
          {currentCpm > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>CPM atual: <strong>R$ {currentCpm.toFixed(2)}/mil</strong></p>
              {autoProfit !== null && (
                <p>Lucro automático: <strong className={autoProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(autoProfit)}
                </strong></p>
              )}
              <div className="space-y-1 pt-2">
                <Label htmlFor="profit_override">Override de Lucro (opcional)</Label>
                <Input id="profit_override" type="number" step="0.01" value={overrideProfit}
                  onChange={(e) => setOverrideProfit(e.target.value)}
                  placeholder="Deixe vazio para usar lucro automático" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="buyer">Comprador</Label>
            <Input id="buyer" name="buyer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expected_receipt_date">Data de Recebimento Prevista</Label>
            <Input id="expected_receipt_date" name="expected_receipt_date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" name="notes" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Write balances API (for CPM lookup)**

`apps/web/src/app/api/balances/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const programId = searchParams.get('program_id')
  const holderId = searchParams.get('holder_id')

  let query = supabase
    .from('balances')
    .select('*, programs:program_id(name), holders:holder_id(name)')

  if (programId) query = query.eq('program_id', programId)
  if (holderId) query = query.eq('holder_id', holderId)

  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/sales/ apps/web/src/app/sales/ apps/web/src/app/api/balances/ && git commit -m "feat: add sales CRUD with auto CPM calculation and override"
```

---

### Task 10: Emissions CRUD

**Files:**
- Create: `apps/web/src/app/api/emissions/route.ts`
- Create: `apps/web/src/app/api/emissions/[id]/route.ts`
- Create: `apps/web/src/app/api/emissions/check/route.ts`
- Create: `apps/web/src/app/emissions/page.tsx`
- Create: `apps/web/src/app/emissions/new/page.tsx`
- Create: `apps/web/src/components/forms/emission-form.tsx`

- [ ] **Step 1: Write emissions API**

`apps/web/src/app/api/emissions/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('emissions')
    .select('*, programs:program_id(name), cpfs:cpf_id(name, document), holders:holder_id(name)')
    .order('issued_at', { ascending: false })
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Fetch program to validate limits
  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('id', body.program_id)
    .single()

  if (!program) return NextResponse.json({ data: null, error: 'Program not found' }, { status: 404 })

  if (program.limit_window_type !== 'none') {
    let countQuery = supabase
      .from('emissions')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', body.program_id)
      .eq('cpf_id', body.cpf_id)

    if (program.limit_window_type === 'rolling') {
      const since = new Date()
      since.setDate(since.getDate() - program.limit_window_days)
      countQuery = countQuery.gte('issued_at', since.toISOString().split('T')[0])
    } else if (program.limit_window_type === 'fixed' && program.limit_start_date) {
      countQuery = countQuery.gte('issued_at', program.limit_start_date)
    }

    const { count } = await countQuery

    if (count !== null && count >= program.emission_limit) {
      return NextResponse.json(
        { data: null, error: `LIMIT_EXCEEDED: Limite de ${program.emission_limit} emissões excedido para este CPF no programa ${program.name}` },
        { status: 422 }
      )
    }
  }

  const { data, error } = await supabase.from('emissions').insert(body).select().single()
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data, error: null })
}
```

`apps/web/src/app/api/emissions/check/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const programId = searchParams.get('program_id')
  const cpfId = searchParams.get('cpf_id')

  if (!programId || !cpfId) {
    return NextResponse.json({ data: null, error: 'program_id and cpf_id required' }, { status: 400 })
  }

  const { data: program } = await supabase.from('programs').select('*').eq('id', programId).single()
  if (!program) return NextResponse.json({ data: null, error: 'Program not found' }, { status: 404 })

  let count = 0
  let cooldownRemaining: number | null = null

  if (program.limit_window_type !== 'none') {
    let countQuery = supabase
      .from('emissions')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('cpf_id', cpfId)

    if (program.limit_window_type === 'rolling') {
      const since = new Date()
      since.setDate(since.getDate() - program.limit_window_days)
      countQuery = countQuery.gte('issued_at', since.toISOString().split('T')[0])
    } else if (program.limit_window_type === 'fixed' && program.limit_start_date) {
      countQuery = countQuery.gte('issued_at', program.limit_start_date)
    }

    const result = await countQuery
    count = result.count ?? 0
  }

  if (program.cooldown_days > 0) {
    const { data: lastEmission } = await supabase
      .from('emissions')
      .select('issued_at')
      .eq('program_id', programId)
      .eq('cpf_id', cpfId)
      .order('issued_at', { ascending: false })
      .limit(1)
      .single()

    if (lastEmission) {
      const diffDays = Math.floor(
        (Date.now() - new Date(lastEmission.issued_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays < program.cooldown_days) {
        cooldownRemaining = program.cooldown_days - diffDays
      }
    }
  }

  return NextResponse.json({
    data: {
      available: count < program.emission_limit && cooldownRemaining === null,
      used: count,
      limit: program.emission_limit,
      cooldown_remaining: cooldownRemaining,
    },
    error: null,
  })
}
```

`apps/web/src/app/api/emissions/[id]/route.ts`:
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('emissions').delete().eq('id', id)
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 400 })
  return NextResponse.json({ data: true, error: null })
}
```

- [ ] **Step 2: Write emissions list page**

`apps/web/src/app/emissions/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Emission } from '@/types'
import { formatDate } from '@/lib/utils'

const columns: ColumnDef<Emission>[] = [
  { accessorKey: 'issued_at', header: 'Data', cell: ({ row }) => formatDate(row.original.issued_at) },
  { accessorKey: 'program_name', header: 'Programa' },
  { accessorKey: 'cpf_name', header: 'Passageiro' },
  { accessorKey: 'holder_name', header: 'Titular' },
  { accessorKey: 'ticket_info', header: 'Passagem' },
]

export default async function EmissionsPage() {
  const supabase = await createClient()
  const { data: emissions } = await supabase
    .from('emissions')
    .select('*, programs:program_id(name), cpfs:cpf_id(name, document), holders:holder_id(name)')
    .order('issued_at', { ascending: false })

  const mapped = (emissions ?? []).map((e) => ({
    ...e,
    program_name: (e.programs as { name: string } | null)?.name ?? '-',
    cpf_name: (e.cpfs as { name: string; document: string } | null)?.name ?? '-',
    cpf_document: (e.cpfs as { name: string; document: string } | null)?.document ?? '-',
    holder_name: (e.holders as { name: string } | null)?.name ?? '-',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Emissões</h1>
        <Button asChild><Link href="/emissions/new">Nova Emissão</Link></Button>
      </div>
      <DataTable columns={columns} data={mapped} />
    </div>
  )
}
```

- [ ] **Step 3: Write emission form with limit validation**

`apps/web/src/components/forms/emission-form.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
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
import { Program, Holder, Cpf } from '@/types'

interface EmissionFormProps {
  onSubmit: (data: Record<string, unknown>) => Promise<void>
}

export function EmissionForm({ onSubmit }: EmissionFormProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<Program[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [cpfs, setCpfs] = useState<Cpf[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedCpfId, setSelectedCpfId] = useState('')
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number; available: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/programs').then(r => r.json()).then(d => setPrograms(d.data ?? []))
    fetch('/api/holders').then(r => r.json()).then(d => setHolders(d.data ?? []))
    fetch('/api/cpfs').then(r => r.json()).then(d => setCpfs(d.data ?? []))
  }, [])

  useEffect(() => {
    if (selectedProgramId && selectedCpfId) {
      fetch(`/api/emissions/check?program_id=${selectedProgramId}&cpf_id=${selectedCpfId}`)
        .then(r => r.json())
        .then(d => {
          if (d.data) setLimitInfo(d.data)
        })
    }
  }, [selectedProgramId, selectedCpfId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const data = {
      program_id: form.get('program_id'),
      cpf_id: form.get('cpf_id'),
      holder_id: form.get('holder_id'),
      issued_at: form.get('issued_at'),
      ticket_info: form.get('ticket_info') || null,
    }
    await onSubmit(data)
    setLoading(false)
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program_id">Programa</Label>
            <Select name="program_id" required onValueChange={setSelectedProgramId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf_id">Passageiro (CPF)</Label>
            <Select name="cpf_id" required onValueChange={setSelectedCpfId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {cpfs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} - {c.document}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_id">Titular</Label>
            <Select name="holder_id" required>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issued_at">Data da Emissão</Label>
            <Input id="issued_at" name="issued_at" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket_info">Informações da Passagem</Label>
            <Input id="ticket_info" name="ticket_info" placeholder="Código, rota..." />
          </div>
          {limitInfo && (
            <div className={`rounded-md p-3 text-sm ${
              limitInfo.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {limitInfo.available
                ? `✅ Limite disponível: ${limitInfo.used}/${limitInfo.limit} emissões usadas`
                : `❌ Limite excedido: ${limitInfo.used}/${limitInfo.limit} emissões usadas`}
            </div>
          )}
          <Button type="submit" disabled={loading || (limitInfo !== null && !limitInfo.available)}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/emissions/ apps/web/src/app/emissions/ && git commit -m "feat: add emissions CRUD with limit validation"
```

---

### Task 11: Dashboard PnL Summary + Balances API

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/api/balances/summary/route.ts`
- Create: `apps/web/src/app/api/balances/summary/route.ts` -> dashboard summary endpoint

- [ ] **Step 1: Write dashboard summary API**

`apps/web/src/app/api/balances/summary/route.ts`:
```tsx
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('date, program_id, holder_id, cost, points')
  if (entriesError) return NextResponse.json({ data: null, error: entriesError.message }, { status: 400 })

  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('date, program_id, holder_id, sale_value, points_sold, cpm_at_sale')
  if (salesError) return NextResponse.json({ data: null, error: salesError.message }, { status: 400 })

  const { data: transfers, error: transfersError } = await supabase
    .from('transfers')
    .select('date, from_program_id, holder_id, transfer_fee')
  if (transfersError) return NextResponse.json({ data: null, error: transfersError.message }, { status: 400 })

  const { data: programs } = await supabase.from('programs').select('id, name')
  const { data: holders } = await supabase.from('holders').select('id, name')

  const programMap = new Map(programs?.map(p => [p.id, p.name]) ?? [])
  const holderMap = new Map(holders?.map(h => [h.id, h.name]) ?? [])

  // Build monthly aggregates
  const monthlyMap = new Map<string, {
    mes: string; programa: string; titular: string;
    custo_entradas: number; pts_entradas: number;
    receita_vendas: number; custo_vendas: number;
    taxas_transf: number; pnl_liquido: number;
  }>()

  function getKey(mes: string, progId: string, holderId: string) {
    return `${mes}_${progId}_${holderId}`
  }

  function ensureRow(mes: string, progId: string, holderId: string) {
    const key = getKey(mes, progId, holderId)
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        mes,
        programa: programMap.get(progId) ?? '-',
        titular: holderMap.get(holderId) ?? '-',
        custo_entradas: 0, pts_entradas: 0,
        receita_vendas: 0, custo_vendas: 0,
        taxas_transf: 0, pnl_liquido: 0,
      })
    }
    return monthlyMap.get(key)!
  }

  for (const e of entries ?? []) {
    const mes = e.date.substring(0, 7)
    const row = ensureRow(mes, e.program_id, e.holder_id)
    row.custo_entradas += Number(e.cost)
    row.pts_entradas += e.points
  }

  for (const s of sales ?? []) {
    const mes = s.date.substring(0, 7)
    const row = ensureRow(mes, s.program_id, s.holder_id)
    row.receita_vendas += Number(s.sale_value)
    if (s.cpm_at_sale) {
      row.custo_vendas += (s.points_sold * Number(s.cpm_at_sale)) / 1000
    }
  }

  for (const t of transfers ?? []) {
    const mes = t.date.substring(0, 7)
    const row = ensureRow(mes, t.from_program_id, t.holder_id)
    row.taxas_transf += Number(t.transfer_fee)
  }

  for (const row of monthlyMap.values()) {
    row.pnl_liquido = row.receita_vendas - row.custo_vendas - row.custo_entradas - row.taxas_transf
  }

  return NextResponse.json({
    data: Array.from(monthlyMap.values()).sort((a, b) => b.mes.localeCompare(a.mes)),
    error: null,
  })
}
```

- [ ] **Step 2: Update dashboard page with full PnL**

`apps/web/src/app/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DashboardSummary } from '@/types'

const columns: ColumnDef<DashboardSummary>[] = [
  { accessorKey: 'mes', header: 'Mês' },
  { accessorKey: 'programa', header: 'Programa' },
  { accessorKey: 'titular', header: 'Titular' },
  {
    accessorKey: 'custo_entradas',
    header: 'Custo Entradas',
    cell: ({ row }) => formatCurrency(row.original.custo_entradas),
  },
  {
    accessorKey: 'pts_entradas',
    header: 'Pontos',
    cell: ({ row }) => formatNumber(row.original.pts_entradas),
  },
  {
    accessorKey: 'receita_vendas',
    header: 'Receita',
    cell: ({ row }) => formatCurrency(row.original.receita_vendas),
  },
  {
    accessorKey: 'pnl_liquido',
    header: 'PnL',
    cell: ({ row }) => {
      const val = row.original.pnl_liquido
      return <span className={val >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {formatCurrency(val)}
      </span>
    },
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: balances } = await supabase
    .from('balances')
    .select('*, programs:program_id(name), holders:holder_id(name)')

  const { data: summary } = await supabase
    .from('sales')
    .select('profit_final')

  const totalPoints = balances?.reduce((sum, b) => sum + b.total_points, 0) ?? 0
  const totalCost = balances?.reduce((sum, b) => sum + Number(b.total_cost), 0) ?? 0
  const avgCpm = totalPoints > 0 ? (totalCost / totalPoints) * 1000 : 0
  const totalProfit = summary?.reduce((sum, s) => sum + Number(s.profit_final ?? 0), 0) ?? 0

  // Monthly summary will be computed below from raw data

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalPoints)}</div>
            <p className="text-xs text-muted-foreground">pontos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">investido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPM Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {avgCpm.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">por milheiro</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">todas as vendas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PnL Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={monthlyData.data ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Fix dashboard server-side fetch**

Replace the client-side fetch in the dashboard with a direct Supabase query:

`apps/web/src/app/page.tsx` (replace the fetch section):
```tsx
  // Build monthly summary from raw data (server-side)
  const { data: allEntries } = await supabase.from('entries').select('date, program_id, holder_id, cost, points')
  const { data: allSales } = await supabase.from('sales').select('date, program_id, holder_id, sale_value, points_sold, cpm_at_sale')
  const { data: allTransfers } = await supabase.from('transfers').select('date, from_program_id, holder_id, transfer_fee')
  const { data: allPrograms } = await supabase.from('programs').select('id, name')
  const { data: allHolders } = await supabase.from('holders').select('id, name')

  const progMap = new Map(allPrograms?.map(p => [p.id, p.name]) ?? [])
  const holdMap = new Map(allHolders?.map(h => [h.id, h.name]) ?? [])

  const monthlyMap = new Map<string, DashboardSummary>()

  function getKey(mes: string, progId: string, holderId: string) {
    return `${mes}_${progId}_${holderId}`
  }
  function ensureRow(mes: string, progId: string, holderId: string) {
    const key = getKey(mes, progId, holderId)
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        mes, programa: progMap.get(progId) ?? '-', titular: holdMap.get(holderId) ?? '-',
        custo_entradas: 0, pts_entradas: 0, receita_vendas: 0, custo_vendas: 0, taxas_transf: 0, pnl_liquido: 0,
      })
    }
    return monthlyMap.get(key)!
  }

  for (const e of allEntries ?? []) {
    const r = ensureRow(e.date.substring(0, 7), e.program_id, e.holder_id)
    r.custo_entradas += Number(e.cost); r.pts_entradas += e.points
  }
  for (const s of allSales ?? []) {
    const r = ensureRow(s.date.substring(0, 7), s.program_id, s.holder_id)
    r.receita_vendas += Number(s.sale_value)
    if (s.cpm_at_sale) r.custo_vendas += (s.points_sold * Number(s.cpm_at_sale)) / 1000
  }
  for (const t of allTransfers ?? []) {
    const r = ensureRow(t.date.substring(0, 7), t.from_program_id, t.holder_id)
    r.taxas_transf += Number(t.transfer_fee)
  }

  const summaryData = Array.from(monthlyMap.values())
    .map(r => ({ ...r, pnl_liquido: r.receita_vendas - r.custo_vendas - r.custo_entradas - r.taxas_transf }))
    .sort((a, b) => b.mes.localeCompare(a.mes))
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/api/balances/ && git commit -m "feat: add full dashboard with PnL monthly summary and balance cards"
```

---

### Task 12: Supabase Seed Data + Final Polish

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Write seed data**

`supabase/seed.sql`:
```sql
-- Seed data for development
INSERT INTO tenants (id, name, slug) VALUES
  (gen_random_uuid(), 'Milheiro Dev', 'dev')
ON CONFLICT (slug) DO NOTHING;

-- Programs
INSERT INTO programs (tenant_id, name, slug, emission_limit, limit_window_type, limit_window_days, cooldown_days) VALUES
  ((SELECT id FROM tenants WHERE slug = 'dev'), 'Smiles', 'smiles', 25, 'rolling', 365, 0),
  ((SELECT id FROM tenants WHERE slug = 'dev'), 'LATAM Pass', 'latam', 24, 'rolling', 365, 0),
  ((SELECT id FROM tenants WHERE slug = 'dev'), 'Azul Fidelidade', 'azul', 5, 'rolling', 365, 60),
  ((SELECT id FROM tenants WHERE slug = 'dev'), 'Livelo', 'livelo', 0, 'none', 0, 0),
  ((SELECT id FROM tenants WHERE slug = 'dev'), 'Esfera', 'esfera', 0, 'none', 0, 0)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- Holders
INSERT INTO holders (tenant_id, name) VALUES
  ((SELECT id FROM tenants WHERE slug = 'dev'), 'André'),
  ((SELECT id FROM tenants WHERE slug = 'dev'), 'Esposa')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Update sidebar with active link styling**

`apps/web/src/components/sidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/entries', label: 'Entradas', icon: '📥' },
  { href: '/transfers', label: 'Transferências', icon: '🔄' },
  { href: '/sales', label: 'Vendas', icon: '💰' },
  { href: '/emissions', label: 'Emissões', icon: '🎫' },
  { href: '/holders', label: 'Titulares', icon: '👤' },
  { href: '/programs', label: 'Programas', icon: '🏪' },
  { href: '/cpfs', label: 'CPFs', icon: '🪪' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 border-r bg-muted/30 p-4 flex flex-col gap-1">
      <div className="text-lg font-bold mb-6 px-2">Milheiro</div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
              pathname === link.href && 'bg-accent font-medium'
            )}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Final validation — build check**

```bash
cd /home/andreluiz0787/repos/milheiro/apps/web
npm run build
```
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql apps/web/src/components/sidebar.tsx && git commit -m "chore: add seed data and polish sidebar with active state"
```
