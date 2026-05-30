-- Permite usuários do ESC (appescala.usuarios) lerem branding do Painel (public.tenants)
-- Rodar no mesmo Supabase DEV/PROD dos dois sistemas

CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, appescala
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    (
      SELECT tenant_id FROM appescala.usuarios
      WHERE auth_user_id = auth.uid() AND ativo IS DISTINCT FROM false
      LIMIT 1
    )
  );
$$;

NOTIFY pgrst, 'reload schema';
