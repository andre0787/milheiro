-- Rename emissions table to tickets
ALTER TABLE IF EXISTS emissions RENAME TO tickets;

-- Remove cpf_id from sales, add buyer_id and ticket_id
ALTER TABLE sales DROP COLUMN IF EXISTS cpf_id;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES cpfs(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id);
