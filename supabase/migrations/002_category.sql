-- 002_category.sql
-- Add category to programs (points vs miles)

ALTER TABLE programs ADD COLUMN category TEXT NOT NULL DEFAULT 'points'
  CHECK (category IN ('points', 'miles'));

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
