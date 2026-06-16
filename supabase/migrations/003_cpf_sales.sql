-- Migration 003: CPF opcional + Sales vinculadas a CPF + Emission vinculada a Sale
-- CPF document becomes optional (dado sensivel)
-- Sales agora vinculam a um CPF (viajante/comprador)
-- Emissions vinculam a uma Sale

-- Make CPF document optional
ALTER TABLE cpfs ALTER COLUMN document DROP NOT NULL;
ALTER TABLE cpfs DROP CONSTRAINT IF EXISTS cpfs_document_key;

-- Add cpf_id to sales, drop buyer
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cpf_id UUID REFERENCES cpfs(id);

-- Link existing sales to first CPF (migration safety)
UPDATE sales SET cpf_id = (SELECT id FROM cpfs ORDER BY created_at LIMIT 1) WHERE cpf_id IS NULL;

ALTER TABLE sales ALTER COLUMN cpf_id SET NOT NULL;
ALTER TABLE sales DROP COLUMN IF EXISTS buyer;

-- Add sale_id to emissions
ALTER TABLE emissions ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id);

-- Link existing emissions to first sale (migration safety)
UPDATE emissions SET sale_id = (SELECT id FROM sales ORDER BY created_at LIMIT 1) WHERE sale_id IS NULL;

ALTER TABLE emissions ALTER COLUMN sale_id SET NOT NULL;
