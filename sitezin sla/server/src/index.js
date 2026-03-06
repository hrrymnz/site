import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test DB connection com retry
let retries = 0;
const maxRetries = 30;
const testConnection = () => {
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      retries++;
      if (retries < maxRetries) {
        console.log(`Tentando conectar ao DB (${retries}/${maxRetries})...`);
        setTimeout(testConnection, 1000);
      } else {
        console.error('❌ Falha ao conectar ao banco após', maxRetries, 'tentativas:', err);
      }
    } else {
      console.log('✅ Conectado ao PostgreSQL:', result.rows[0].now);
    }
  });
};
testConnection();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ===== ITEMS Routes =====

// GET todos os items
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM items ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar items' });
  }
});

// GET items por categoria (era)
app.get('/api/items/:era', async (req, res) => {
  try {
    const { era } = req.params;
    const result = await pool.query(
      'SELECT * FROM items WHERE category = $1 ORDER BY created_at DESC',
      [era]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar items' });
  }
});

// POST novo item
app.post('/api/items', async (req, res) => {
  try {
    const { title, url, content, category, type } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ error: 'Title e category sao obrigatorios' });
    }

    const result = await pool.query(
      'INSERT INTO items (title, url, content, category, type, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [title, url || null, content || null, category, type || 'link']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

// PUT atualizar item
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, content, category, type, pinned } = req.body;

    const result = await pool.query(
      'UPDATE items SET title = COALESCE($1, title), url = COALESCE($2, url), content = COALESCE($3, content), category = COALESCE($4, category), type = COALESCE($5, type), pinned = COALESCE($6, pinned) WHERE id = $7 RETURNING *',
      [title, url, content, category, type, pinned, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item nao encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// DELETE item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item nao encontrado' });
    }

    res.json({ message: 'Item deletado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

// ===== APP STATE Routes =====

// GET estado completo persistido (backup vivo do frontend)
app.get('/api/state/:scope', async (req, res) => {
  try {
    const { scope } = req.params;
    const result = await pool.query(
      'SELECT scope, state, updated_at FROM app_state WHERE scope = $1 LIMIT 1',
      [scope]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estado nao encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estado do app' });
  }
});

// PUT upsert do estado completo persistido
app.put('/api/state/:scope', async (req, res) => {
  try {
    const { scope } = req.params;
    const { state } = req.body;

    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Campo state eh obrigatorio' });
    }

    const result = await pool.query(
      `INSERT INTO app_state (scope, state, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (scope)
       DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
       RETURNING scope, state, updated_at`,
      [scope, JSON.stringify(state)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar estado do app' });
  }
});

// POST cria uma versao historica do estado atual (ou do estado informado)
app.post('/api/state/:scope/versions', async (req, res) => {
  try {
    const { scope } = req.params;
    const { state, label } = req.body || {};

    let snapshot = state;
    if (!snapshot || typeof snapshot !== 'object') {
      const current = await pool.query(
        'SELECT state FROM app_state WHERE scope = $1 LIMIT 1',
        [scope]
      );
      snapshot = current.rows[0] ? current.rows[0].state : {};
    }

    const result = await pool.query(
      `INSERT INTO app_state_versions (scope, state, label, created_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       RETURNING id, scope, label, created_at`,
      [scope, JSON.stringify(snapshot), label || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar versao do estado' });
  }
});

// GET lista versoes de estado para um escopo
app.get('/api/state/:scope/versions', async (req, res) => {
  try {
    const { scope } = req.params;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 30;

    const result = await pool.query(
      `SELECT id, scope, label, created_at
       FROM app_state_versions
       WHERE scope = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [scope, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar versoes do estado' });
  }
});

// GET detalha uma versao especifica
app.get('/api/state/:scope/versions/:versionId', async (req, res) => {
  try {
    const { scope, versionId } = req.params;
    const result = await pool.query(
      `SELECT id, scope, state, label, created_at
       FROM app_state_versions
       WHERE scope = $1 AND id = $2
       LIMIT 1`,
      [scope, versionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Versao nao encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar versao do estado' });
  }
});

// POST restaura uma versao e a torna estado atual
app.post('/api/state/:scope/versions/:versionId/restore', async (req, res) => {
  const client = await pool.connect();
  try {
    const { scope, versionId } = req.params;
    await client.query('BEGIN');

    const versionResult = await client.query(
      `SELECT state
       FROM app_state_versions
       WHERE scope = $1 AND id = $2
       LIMIT 1`,
      [scope, versionId]
    );

    if (versionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Versao nao encontrada' });
    }

    const restoredState = versionResult.rows[0].state;

    const currentResult = await client.query(
      `INSERT INTO app_state (scope, state, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (scope)
       DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
       RETURNING scope, state, updated_at`,
      [scope, JSON.stringify(restoredState)]
    );

    await client.query(
      `INSERT INTO app_state_versions (scope, state, label, created_at)
       VALUES ($1, $2::jsonb, $3, NOW())`,
      [scope, JSON.stringify(restoredState), `restore-from-${versionId}`]
    );

    await client.query('COMMIT');
    res.json(currentResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao restaurar versao do estado' });
  } finally {
    client.release();
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
