-- Row-Level Security for production
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_cpfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

-- Allow all operations for MVP (no login yet)
CREATE POLICY "allow_all" ON tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON holders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON cpfs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON operation_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON ticket_cpfs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON balances FOR ALL USING (true) WITH CHECK (true);
