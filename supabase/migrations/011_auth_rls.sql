-- 011_auth_rls.sql
-- Authentication: user→tenant mapping + per-tenant RLS policies

CREATE TABLE user_tenants (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_tenants IS 'Maps Supabase Auth user_id to tenant_id. First Google login associates with default tenant.';

-- RLS helper: returns tenant_id for the authenticated user
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
$$;

-- Replace allow_all policies with tenant_isolation on all 11 tables

DROP POLICY IF EXISTS "allow_all" ON tenants;
CREATE POLICY "tenant_isolation" ON tenants
  FOR ALL USING (id = get_tenant_id())
  WITH CHECK (id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON programs;
CREATE POLICY "tenant_isolation" ON programs
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON holders;
CREATE POLICY "tenant_isolation" ON holders
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON cpfs;
CREATE POLICY "tenant_isolation" ON cpfs
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON operation_types;
CREATE POLICY "tenant_isolation" ON operation_types
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON entries;
CREATE POLICY "tenant_isolation" ON entries
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON transfers;
CREATE POLICY "tenant_isolation" ON transfers
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON sales;
CREATE POLICY "tenant_isolation" ON sales
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON tickets;
CREATE POLICY "tenant_isolation" ON tickets
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allow_all" ON ticket_cpfs;
CREATE POLICY "tenant_isolation" ON ticket_cpfs
  FOR ALL USING (
    ticket_id IN (SELECT id FROM tickets WHERE tenant_id = get_tenant_id())
    AND cpf_id IN (SELECT id FROM cpfs WHERE tenant_id = get_tenant_id())
  )
  WITH CHECK (
    ticket_id IN (SELECT id FROM tickets WHERE tenant_id = get_tenant_id())
    AND cpf_id IN (SELECT id FROM cpfs WHERE tenant_id = get_tenant_id())
  );

DROP POLICY IF EXISTS "allow_all" ON balances;
CREATE POLICY "tenant_isolation" ON balances
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- Protect user_tenants itself
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_mapping" ON user_tenants
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "service_insert" ON user_tenants
  FOR INSERT WITH CHECK (true);

-- Re-grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
