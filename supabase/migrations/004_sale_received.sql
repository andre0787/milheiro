-- Migration 004: Flag de recebimento na venda
ALTER TABLE sales ADD COLUMN IF NOT EXISTS received BOOLEAN DEFAULT false;
UPDATE sales SET received = true WHERE received IS NULL;
