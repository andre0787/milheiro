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
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
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
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
  name TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operation types (categories for entries)
CREATE TABLE operation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_purchase BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, slug)
);

-- Insert default operation types
INSERT INTO operation_types (tenant_id, name, slug, is_purchase)
SELECT id, 'Clube de Assinatura', 'clube', TRUE FROM tenants WHERE slug = 'me'
UNION ALL
SELECT id, 'Compra com Desconto', 'compra-desconto', TRUE FROM tenants WHERE slug = 'me'
UNION ALL
SELECT id, 'Transferência de Carrinho', 'transf-carrinho', FALSE FROM tenants WHERE slug = 'me'
UNION ALL
SELECT id, 'Bônus Promocional', 'bonus', FALSE FROM tenants WHERE slug = 'me'
UNION ALL
SELECT id, 'Compra de Pontos', 'compra-pontos', TRUE FROM tenants WHERE slug = 'me';

-- Entries (purchases/accumulations)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
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
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
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
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
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
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emissions (ticket issuances)
CREATE TABLE emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
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
  tenant_id UUID NOT NULL DEFAULT (SELECT id FROM tenants LIMIT 1) REFERENCES tenants(id),
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
