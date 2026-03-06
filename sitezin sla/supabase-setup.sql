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

-- RLS (Row Level Security) - desabilitar para acesso publico simples
-- Se quiser proteger depois, habilite e crie policies
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state_versions ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (acesso publico via anon key)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_state' AND policyname = 'Allow all on app_state') THEN
    CREATE POLICY "Allow all on app_state" ON app_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_state_versions' AND policyname = 'Allow all on app_state_versions') THEN
    CREATE POLICY "Allow all on app_state_versions" ON app_state_versions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
