-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Tabela de estado do app (snapshot completo do frontend)
CREATE TABLE IF NOT EXISTS app_state (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(100) UNIQUE NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historico de versoes para rollback
CREATE TABLE IF NOT EXISTS app_state_versions (
  id BIGSERIAL PRIMARY KEY,
  scope VARCHAR(100) NOT NULL,
  state JSONB NOT NULL,
  label VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_state_scope ON app_state(scope);
CREATE INDEX IF NOT EXISTS idx_app_state_versions_scope ON app_state_versions(scope, created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state_versions ENABLE ROW LEVEL SECURITY;

-- Policies: usuario so acessa dados do proprio scope (que eh o user id)
DO $$ BEGIN
  -- Drop old permissive policies if they exist
  DROP POLICY IF EXISTS "Allow all on app_state" ON app_state;
  DROP POLICY IF EXISTS "Allow all on app_state_versions" ON app_state_versions;

  -- User can only read/write their own scope
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_state' AND policyname = 'User owns scope') THEN
    CREATE POLICY "User owns scope" ON app_state FOR ALL
      USING (scope = auth.uid()::text)
      WITH CHECK (scope = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_state_versions' AND policyname = 'User owns version scope') THEN
    CREATE POLICY "User owns version scope" ON app_state_versions FOR ALL
      USING (scope = auth.uid()::text)
      WITH CHECK (scope = auth.uid()::text);
  END IF;
END $$;
