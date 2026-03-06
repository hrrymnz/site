-- Tabela de Items (repositorios, links, etc)
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  url TEXT,
  content TEXT,
  category VARCHAR(50) NOT NULL, -- debut, fearless, speak-now, red, 1989, reputation, lover, folklore
  type VARCHAR(50) DEFAULT 'link', -- link, repo, note, etc
  pinned BOOLEAN DEFAULT FALSE,
  access_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Preferencias GitHub
CREATE TABLE IF NOT EXISTS github_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  period_days INT DEFAULT 30,
  limit_commits INT DEFAULT 8,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Estado completo do frontend por escopo (ex.: default)
CREATE TABLE IF NOT EXISTS app_state (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(100) UNIQUE NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historico/versionamento dos snapshots para rollback temporal
CREATE TABLE IF NOT EXISTS app_state_versions (
  id BIGSERIAL PRIMARY KEY,
  scope VARCHAR(100) NOT NULL,
  state JSONB NOT NULL,
  label VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_app_state_scope ON app_state(scope);
CREATE INDEX IF NOT EXISTS idx_app_state_versions_scope_created_at ON app_state_versions(scope, created_at DESC);

-- Alguns dados de exemplo
INSERT INTO items (title, url, content, category, type, tags) VALUES
('React Docs', 'https://react.dev', 'Official React documentation', 'debut', 'link', '{react,docs}'),
('Taylor Swift Wikipedia', 'https://wikipedia.org/wiki/Taylor_Swift', 'Taylor Swift biography', 'fearless', 'link', '{taylor,swift}')
ON CONFLICT DO NOTHING;
