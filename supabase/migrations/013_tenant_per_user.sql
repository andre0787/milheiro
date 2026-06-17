-- 013_tenant_per_user.sql
-- Each new auth user gets their own tenant (SaaS model)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (id, name, slug)
  VALUES (gen_random_uuid(), COALESCE(NEW.email, NEW.id::text), NEW.id::text)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.user_tenants (user_id, tenant_id)
  VALUES (NEW.id, v_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user() IS 'Creates a new tenant for each auth user and maps user to it.';
