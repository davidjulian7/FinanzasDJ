-- RLS para FinanzasDJ: solo el service role (servidor) accede.
-- La app usa service role (bypass de RLS); estas políticas impiden que la
-- anon key lea/escriba datos directamente via REST de Supabase.
-- Aplicar desde: Supabase Dashboard > SQL Editor, o via psql.

-- Tablas con user_id: cada usuario solo ve/modifica sus filas.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['accounts','expense_categories','recurring_expenses','transactions','apartados','apartado_contribuciones','debts','cuotas','settings']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "usuario_own_select" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "usuario_own_insert" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "usuario_own_update" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "usuario_own_delete" ON %I', t);
    EXECUTE format('CREATE POLICY "usuario_own_select" ON %I FOR SELECT USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "usuario_own_insert" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "usuario_own_update" ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "usuario_own_delete" ON %I FOR DELETE USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;

-- auth_attempts: solo service role (sin políticas = anon/authenticated denegados).
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- budget_groups es referencia global: solo lectura para usuarios autenticados.
ALTER TABLE budget_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_select" ON budget_groups;
CREATE POLICY "grupos_select" ON budget_groups FOR SELECT USING (auth.role() = 'authenticated');