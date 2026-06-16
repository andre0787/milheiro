# Milheiro — Gerenciador de Pontos e Milhas

## 1. Resumo Executivo

**Milheiro** é um sistema web de uso pessoal (sem autenticação inicial) para gerenciar acúmulo, transferência e venda de milhas aéreas no mercado brasileiro. Calcula PnL mensal/acumulado usando **CPM por Média Ponderada**, controla limites de emissão por CPF, e prepara arquitetura para futuro SaaS multi-tenant.

**Stack:** Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui + Supabase (PostgreSQL)

## 2. User Stories (MVP)

| ID | Como... | Quero... | Para... |
|---|---|---|---|
| US1 | Usuário | Cadastrar programas de fidelidade (nome, regras) | Configurar o sistema |
| US2 | Usuário | Cadastrar titulares (contas) | Gerenciar múltiplas contas |
| US3 | Usuário | Registrar compra/acúmulo de pontos (programa + titular + qtd + valor + tipo) | Alimentar o saldo |
| US4 | Usuário | Registrar transferência entre programas (origem → destino + bônus + taxas) | Mover pontos com custo correto |
| US5 | Usuário | Registrar venda (programa + titular + qtd + valor + comprador) | Calcular lucro automaticamente |
| US6 | Usuário | Sobrescrever lucro calculado manualmente | Ajustar operações atípicas |
| US7 | Usuário | Cadastrar CPFs de passageiros | Controlar limites de emissão |
| US8 | Usuário | Registrar emissão de passagem (programa + CPF) | Abater do limite anual |
| US9 | Usuário | Ver dashboard com PnL mensal/acumulado e saldos | Tomar decisões informadas |

## 3. Regras de Negócio

### RN1 — CPM por Média Ponderada

- CPM é calculado por par **(programa, titular)**
- `CPM = (custo_total / saldo_total) × 1000`
- Entradas: `saldo += qtd`, `custo_total += valor_pago`
- Saídas: `saldo -= qtd`, `custo_total -= (qtd × CPM_atual)`
- Implementado via triggers PostgreSQL (consistência ACID)

### RN2 — Transferências

- Origem: debita saldo usando CPM médio (mesma lógica de saída)
- Destino: credita saldo final (qtd × bônus), custo = custo debitado + taxas
- CPM do destino é recalculado por média ponderada com saldo existente

### RN3 — Vendas

- Lucro automático = `valor_venda - (qtd × CPM_atual / 1000)`
- Usuário pode sobrescrever (campo `profit_override`). Se preenchido, vira o lucro oficial.
- Se override diferir > 50% do automático, pede confirmação adicional.

### RN4 — Limites de Emissão

- Configurável por programa: `limite`, `tipo_janela (rolling|fixed|none)`, `dias_janela`, `data_inicio`, `carência_dias`
- Rolling: conta emissões nos últimos N dias
- Fixa: conta a partir da `data_inicio`
- Validação no INSERT de `emissions`

### RN5 — Estornos

- Entrada sem vendas vinculadas: deleta (reverte saldo)
- Entrada com vendas vinculadas: permite com flag `force` (ajusta CPM, avisa na UI)
- Venda: estorna saldo usando **CPM da época da venda**
- Transferência: estorna ambos os lados (origem → crédito, destino → débito do valor recebido)

### RN6 — Multi-tenant (preparação)

- Toda tabela tem `tenant_id UUID NOT NULL DEFAULT gen_random_uuid()`
- MVP: tenant único, sem auth
- Futuro: RLS + Supabase Auth, sem refazer schema

## 4. Modelagem de Dados

### Tabelas

```sql
-- tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- programs
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

-- holders
CREATE TABLE holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  name TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- operation_types
CREATE TABLE operation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_purchase BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, slug)
);

-- entries
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

-- transfers
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

-- sales
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

-- cpfs
CREATE TABLE cpfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES tenants(id),
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- emissions
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

-- balances (materializada via triggers)
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
```

### Mecânica dos Triggers

O coração do sistema está em 3 triggers no PostgreSQL:

1. **`trg_entry_upsert`** na `entries`: `INSERT` → upsert em `balances` (soma saldo e custo)
2. **`trg_sale_upsert`** na `sales`: `INSERT` → calcula `profit_auto` com base no CPM atual, debita de `balances`
3. **`trg_transfer_upsert`** na `transfers`: `INSERT` → debita da origem, credita no destino com custo ajustado

Cada trigger é uma função `plpgsql` que executa em transação.

## 5. Dashboard

Cards do dashboard:

- Lucro do mês (R$)
- Lucro acumulado no ano (R$)
- Saldo total de pontos
- CPM médio ponderado geral
- Top 3 programas com maior saldo

Query agregada mensal:

```sql
WITH monthly AS (
  SELECT
    date_trunc('month', e.date) AS mes,
    e.program_id,
    e.holder_id,
    SUM(e.cost) AS custo_entradas,
    SUM(e.points) AS pts_entradas,
    0::decimal AS receita_vendas,
    0::decimal AS custo_vendas,
    0::decimal AS taxas_transf
  FROM entries e GROUP BY 1, 2, 3
  UNION ALL
  SELECT
    date_trunc('month', s.date),
    s.program_id,
    s.holder_id,
    0, 0,
    SUM(s.sale_value),
    SUM(s.points_sold * (s.cpm_at_sale / 1000.0)),
    0
  FROM sales s GROUP BY 1, 2, 3
  UNION ALL
  SELECT
    date_trunc('month', t.date),
    t.from_program_id,
    t.holder_id,
    0, 0, 0, 0,
    SUM(t.transfer_fee)
  FROM transfers t GROUP BY 1, 2, 3
)
SELECT
  mes,
  p.name AS programa,
  h.name AS titular,
  SUM(custo_entradas) AS custo_entradas,
  SUM(pts_entradas) AS pts_entradas,
  SUM(receita_vendas) AS receita_vendas,
  SUM(custo_vendas) AS custo_vendas,
  SUM(taxas_transf) AS taxas_transf,
  SUM(receita_vendas) - SUM(custo_vendas) - SUM(custo_entradas) - SUM(taxas_transf) AS pnl_liquido
FROM monthly m
JOIN programs p ON p.id = m.program_id
JOIN holders h ON h.id = m.holder_id
GROUP BY 1, 2, 3
ORDER BY 1 DESC;
```

## 6. API / Endpoints

```
GET    /api/holders           → Lista titulares
POST   /api/holders           → Criar titular
PUT    /api/holders/[id]      → Atualizar titular
DELETE /api/holders/[id]      → Remover

GET    /api/programs          → Lista programas
POST   /api/programs          → Criar programa (com regras de limite)
PUT    /api/programs/[id]     → Atualizar programa/regras
DELETE /api/programs/[id]     → Remover

GET    /api/entries           → Lista entradas (filtro: programa, holder, data)
POST   /api/entries           → Registrar acúmulo/compra
PUT    /api/entries/[id]      → Corrigir entrada
DELETE /api/entries/[id]      → Estornar entrada

GET    /api/transfers         → Lista transferências
POST   /api/transfers         → Registrar transferência
DELETE /api/transfers/[id]    → Estornar

GET    /api/sales             → Lista vendas
POST   /api/sales             → Registrar venda
PUT    /api/sales/[id]        → Atualizar
DELETE /api/sales/[id]        → Estornar

GET    /api/emissions         → Lista emissões
POST   /api/emissions         → Registrar emissão (valida limite)
GET    /api/emissions/check   → Verifica limite disponível

GET    /api/cpfs              → Lista CPFs
POST   /api/cpfs              → Cadastrar CPF

GET    /api/balances          → Saldos e CPM por programa+titular
GET    /api/balances/summary  → Dashboard consolidado
```

## 7. UI / Componentes

```
/                     → Dashboard (PnL mensal, saldo por programa)
/holders              → CRUD Titulares
/entries              → Lista + formulário de acúmulo
/transfers            → Lista + formulário de transferência
/sales                → Lista + formulário de venda
/emissions            → Controle de CPFs e limites emitidos
/programs             → CRUD Programas + regras de limite
/cpfs                 → CRUD CPFs
```

Componentes: DataTable (TanStack Table), EntryForm, TransferForm, SaleForm, CpmBadge, EmissionGauge, PnLSummary.

## 8. Estrutura de Pastas

```
milheiro/
├── apps/
│   └── web/                          # Next.js App
│       ├── src/
│       │   ├── app/
│       │   │   ├── entries/
│       │   │   ├── transfers/
│       │   │   ├── sales/
│       │   │   ├── emissions/
│       │   │   ├── holders/
│       │   │   ├── programs/
│       │   │   ├── cpfs/
│       │   │   ├── page.tsx          # Dashboard
│       │   │   └── api/              # Route Handlers
│       │   ├── components/
│       │   │   ├── ui/               # shadcn/ui
│       │   │   ├── forms/
│       │   │   ├── data-table/
│       │   │   └── dashboard/
│       │   ├── lib/
│       │   │   ├── supabase/
│       │   │   ├── cpm.ts
│       │   │   └── utils.ts
│       │   └── types/
│       └── package.json
├── supabase/
│   ├── config.toml
│   └── seed.sql
└── package.json
```

## 9. Estratégia Multi-tenant (Futuro)

Toda tabela carrega `tenant_id UUID NOT NULL DEFAULT gen_random_uuid()`. MVP: tenant único, sem auth. Futuro: RLS + Supabase Auth.

## 10. Erros de Negócio

- `INSUFFICIENT_BALANCE` — saldo insuficiente para venda/transferência
- `LIMIT_EXCEEDED` — limite de emissão excedido para o CPF
- `COOLDOWN_ACTIVE` — carência entre emissões não respeitada
- `INVALID_CPM_OVERRIDE` — override de lucro muito distante do automático (>50%)
