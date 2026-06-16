-- Remove singular cpf_id from tickets, support multiple via junction table
ALTER TABLE tickets DROP COLUMN IF EXISTS cpf_id;

-- Add ticket date fields
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS outbound_date DATE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS return_date DATE;

-- Junction: one ticket → many CPFs (viajantes)
CREATE TABLE IF NOT EXISTS ticket_cpfs (
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  cpf_id UUID NOT NULL REFERENCES cpfs(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, cpf_id)
);

-- Add telegram contact to cpfs
ALTER TABLE cpfs ADD COLUMN IF NOT EXISTS telegram TEXT;
