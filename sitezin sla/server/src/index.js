import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createClient as createRedisClient } from 'redis';
import { Pool } from 'pg';

dotenv.config();

// Servidor de apoio do projeto: healthcheck, API legacy de items e endpoints
// autenticados para snapshots/versoes do estado da app.
const app = express();
const port = process.env.PORT || 3001;
const host = String(process.env.HOST || '').trim();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const hasSupabaseAuthConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
const enableUnscopedItemsApi = process.env.ENABLE_UNSCOPED_ITEMS_API === 'true';
if (isProduction && enableUnscopedItemsApi) {
  throw new Error('ENABLE_UNSCOPED_ITEMS_API nao pode ser true em producao.');
}
if (isProduction && !allowedOrigins.length) {
  throw new Error('ALLOWED_ORIGINS deve ser definido em producao.');
}
const maxRequestBodySize = String(process.env.MAX_REQUEST_BODY_SIZE || '10mb').trim() || '10mb';
const maxSnapshotBytes = Number(process.env.MAX_SNAPSHOT_BYTES || 2 * 1024 * 1024);
const maxStateVersionsPerScope = Math.min(
  Math.max(Number(process.env.MAX_STATE_VERSIONS_PER_SCOPE || 50), 5),
  200
);
const maxVersionLabelLength = Math.min(
  Math.max(Number(process.env.MAX_VERSION_LABEL_LENGTH || 80), 10),
  200
);
const writeRateLimitWindowMs = Math.max(Number(process.env.WRITE_RATE_LIMIT_WINDOW_MS || 60_000), 1_000);
const writeRateLimitMax = Math.max(Number(process.env.WRITE_RATE_LIMIT_MAX || 30), 1);
const writeRateLimitStore = new Map();
const redisUrl = String(process.env.REDIS_URL || '').trim();
const redisRateLimitClient = redisUrl ? createRedisClient({ url: redisUrl }) : null;
let redisRateLimitReady = false;

function serializeLogError(error) {
  if (!error) return null;

  if (typeof error === 'string') {
    return { message: error };
  }

  const payload = {
    message: String(error.message || error),
    code: error.code ? String(error.code) : undefined
  };

  if (!isProduction && error.stack) {
    payload.stack = String(error.stack);
  }

  return payload;
}

function logEntry(level, event, details = {}) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...details
  };

  if (isProduction) {
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[method](JSON.stringify(entry));
    return;
  }

  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](`[${level.toUpperCase()}] ${event}`, details);
}

function logInfo(event, details = {}) {
  logEntry('info', event, details);
}

function logWarn(event, details = {}) {
  logEntry('warn', event, details);
}

function logError(event, error, details = {}) {
  logEntry('error', event, {
    ...details,
    error: serializeLogError(error)
  });
}

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"]
    }
  },
  hsts: isProduction,
  referrerPolicy: { policy: 'no-referrer' }
}));

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getJsonByteSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function normalizeVersionLabel(value) {
  const label = String(value || '').trim();
  if (!label) return null;
  return label.slice(0, maxVersionLabelLength);
}

function cleanupRateLimitStore(now = Date.now()) {
  writeRateLimitStore.forEach((entry, key) => {
    if (!entry || entry.resetAt <= now) {
      writeRateLimitStore.delete(key);
    }
  });
}

function validateSnapshotState(state) {
  if (!isPlainObject(state)) {
    return 'Campo state deve ser um objeto JSON.';
  }

  let size = 0;
  try {
    size = getJsonByteSize(state);
  } catch {
    return 'Campo state nao pode ser serializado.';
  }

  if (size > maxSnapshotBytes) {
    return `Campo state excede o limite de ${maxSnapshotBytes} bytes.`;
  }

  return '';
}

function safeParseOrigin(origin) {
  if (!origin) return null;
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function normalizeHost(host) {
  return String(host || '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .split(':')[0]
    .toLowerCase();
}

function isLoopbackHost(host) {
  const normalized = normalizeHost(host);
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function isExplicitLocalRequest(req) {
  const hostHeader = normalizeHost(req.headers.host);
  if (!isLoopbackHost(hostHeader)) return false;

  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;

  const parsedOrigin = safeParseOrigin(origin);
  if (!parsedOrigin) return false;
  return isLoopbackHost(parsedOrigin.hostname);
}

function getRateLimitIdentity(req) {
  const authUserId = String(req.authUser?.id || '').trim();
  if (authUserId) return `user:${authUserId}`;

  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const ip = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

function buildCorsMiddleware() {
  const corsMiddleware = cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length) {
        return callback(new Error('CORS bloqueado: ALLOWED_ORIGINS nao configurado.'));
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin nao permitida pelo servidor.'));
    }
  });

  return (req, res, next) => {
    const origin = String(req.headers.origin || '').trim();
    if (origin && !allowedOrigins.length) {
      return res.status(403).json({
        error: 'CORS bloqueado: defina ALLOWED_ORIGINS para liberar origens explicitas.'
      });
    }

    return corsMiddleware(req, res, (error) => {
      if (error) {
        return res.status(403).json({ error: error.message });
      }
      return next();
    });
  };
}

function rateLimitWrites(req, res, next) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const identity = getRateLimitIdentity(req);
  const current = writeRateLimitStore.get(identity);

  if (!current || current.resetAt <= now) {
    writeRateLimitStore.set(identity, {
      count: 1,
      resetAt: now + writeRateLimitWindowMs
    });
    return next();
  }

  if (current.count >= writeRateLimitMax) {
    const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: 'Muitas operacoes de escrita em pouco tempo. Tente novamente em instantes.'
    });
  }

  current.count += 1;
  writeRateLimitStore.set(identity, current);
  return next();
}

async function pruneStateVersions(client, scope) {
  await client.query(
    `DELETE FROM app_state_versions
      WHERE scope = $1
        AND id IN (
          SELECT id
          FROM app_state_versions
          WHERE scope = $1
          ORDER BY created_at DESC
          OFFSET $2
        )`,
    [scope, maxStateVersionsPerScope]
  );
}

async function ensureRedisRateLimitReady() {
  if (!redisRateLimitClient || redisRateLimitReady) return redisRateLimitReady;

  try {
    await redisRateLimitClient.connect();
    redisRateLimitReady = true;
    logInfo('REDIS_RATE_LIMIT_READY', { enabled: true });
  } catch (error) {
    redisRateLimitReady = false;
    logWarn('REDIS_RATE_LIMIT_DISABLED', {
      enabled: false,
      error: serializeLogError(error)
    });
  }

  return redisRateLimitReady;
}

// Middleware
app.use(buildCorsMiddleware());
app.use(express.json({ limit: maxRequestBodySize }));
app.use(express.urlencoded({ limit: maxRequestBodySize, extended: true }));

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
        logInfo('DB_CONNECT_RETRY', { attempt: retries, maxRetries });
        setTimeout(testConnection, 1000);
      } else {
        logError('DB_CONNECT_FAILED', err, { attempts: maxRetries });
      }
    } else {
      logInfo('DB_CONNECTED', { connectedAt: result.rows[0].now });
    }
  });
};
testConnection();

async function resolveSupabaseUser(req) {
  if (!hasSupabaseAuthConfig) return null;

  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return null;

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${match[1]}`
      }
    });

    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id ? user : null;
  } catch {
    return null;
  }
}

async function requireSupabaseAuth(req, res, next) {
  if (!hasSupabaseAuthConfig) {
    return res.status(500).json({
      error: 'Auth do servidor nao configurada. Defina SUPABASE_URL e SUPABASE_ANON_KEY.'
    });
  }

  const user = await resolveSupabaseUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Nao autenticado.' });
  }

  req.authUser = user;
  next();
}

function requireOwnScope(req, res, next) {
  const requestedScope = String(req.params.scope || '').trim();
  const currentUserId = String(req.authUser?.id || '').trim();

  if (!requestedScope || !currentUserId || requestedScope !== currentUserId) {
    return res.status(403).json({ error: 'Acesso negado a escopo de outro usuario.' });
  }

  next();
}

function rejectUnscopedItemsApi(req, res, next) {
  if (!enableUnscopedItemsApi) {
    return res.status(403).json({
      error: 'API legacy de items desativada por seguranca. Defina ENABLE_UNSCOPED_ITEMS_API=true apenas em ambiente privado.'
    });
  }

  if (isProduction) {
    return res.status(403).json({
      error: 'API legacy de items nao pode ser habilitada em producao.'
    });
  }

  if (!isExplicitLocalRequest(req)) {
    return res.status(403).json({
      error: 'API legacy de items so aceita chamadas explicitas de ambiente local.'
    });
  }

  return next();
}

function requireValidSnapshot(req, res, next) {
  const validationError = validateSnapshotState(req.body?.state);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  return next();
}

function sanitizeVersionLabel(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    req.body = {};
  }
  req.body.label = normalizeVersionLabel(req.body.label);
  return next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ===== ITEMS Routes =====

// GET todos os items
app.get('/api/items', rejectUnscopedItemsApi, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM items ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    logError('ITEMS_FETCH_FAILED', err, { route: '/api/items' });
    res.status(500).json({ error: 'Erro ao buscar items' });
  }
});

// GET items por categoria (era)
app.get('/api/items/:era', rejectUnscopedItemsApi, async (req, res) => {
  try {
    const { era } = req.params;
    const result = await pool.query(
      'SELECT * FROM items WHERE category = $1 ORDER BY created_at DESC',
      [era]
    );
    res.json(result.rows);
  } catch (err) {
    logError('ITEMS_BY_ERA_FETCH_FAILED', err, { route: '/api/items/:era' });
    res.status(500).json({ error: 'Erro ao buscar items' });
  }
});

// POST novo item
app.post('/api/items', rejectUnscopedItemsApi, rateLimitWrites, async (req, res) => {
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
    logError('ITEM_CREATE_FAILED', err, { route: '/api/items' });
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

// PUT atualizar item
app.put('/api/items/:id', rejectUnscopedItemsApi, rateLimitWrites, async (req, res) => {
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
    logError('ITEM_UPDATE_FAILED', err, { route: '/api/items/:id' });
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// DELETE item
app.delete('/api/items/:id', rejectUnscopedItemsApi, rateLimitWrites, async (req, res) => {
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
    logError('ITEM_DELETE_FAILED', err, { route: '/api/items/:id' });
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

// ===== APP STATE Routes =====
// Essas rotas so aceitam o scope do proprio usuario autenticado.

// GET estado completo persistido (backup vivo do frontend)
app.get('/api/state/:scope', requireSupabaseAuth, requireOwnScope, async (req, res) => {
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
    logError('APP_STATE_FETCH_FAILED', err, { route: '/api/state/:scope' });
    res.status(500).json({ error: 'Erro ao buscar estado do app' });
  }
});

// PUT upsert do estado completo persistido
app.put('/api/state/:scope', requireSupabaseAuth, requireOwnScope, rateLimitWrites, requireValidSnapshot, async (req, res) => {
  try {
    const { scope } = req.params;
    const { state } = req.body;

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
    logError('APP_STATE_SAVE_FAILED', err, { route: '/api/state/:scope' });
    res.status(500).json({ error: 'Erro ao salvar estado do app' });
  }
});

// POST cria uma versao historica do estado atual (ou do estado informado)
app.post('/api/state/:scope/versions', requireSupabaseAuth, requireOwnScope, rateLimitWrites, sanitizeVersionLabel, async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { scope } = req.params;
    const { state, label } = req.body || {};

    let snapshot = state;
    if (snapshot != null) {
      const validationError = validateSnapshotState(snapshot);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
    }

    if (!snapshot) {
      const current = await client.query(
        'SELECT state FROM app_state WHERE scope = $1 LIMIT 1',
        [scope]
      );
      snapshot = current.rows[0] ? current.rows[0].state : {};
    }

    const validationError = validateSnapshotState(snapshot);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    await client.query('BEGIN');
    transactionStarted = true;
    const result = await client.query(
      `INSERT INTO app_state_versions (scope, state, label, created_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       RETURNING id, scope, label, created_at`,
      [scope, JSON.stringify(snapshot), label]
    );
    await pruneStateVersions(client, scope);
    await client.query('COMMIT');
    transactionStarted = false;

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    logError('APP_STATE_VERSION_CREATE_FAILED', err, { route: '/api/state/:scope/versions' });
    res.status(500).json({ error: 'Erro ao criar versao do estado' });
  } finally {
    client.release();
  }
});

// GET lista versoes de estado para um escopo
app.get('/api/state/:scope/versions', requireSupabaseAuth, requireOwnScope, async (req, res) => {
  try {
    const { scope } = req.params;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, maxStateVersionsPerScope) : 30;

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
    logError('APP_STATE_VERSIONS_LIST_FAILED', err, { route: '/api/state/:scope/versions' });
    res.status(500).json({ error: 'Erro ao listar versoes do estado' });
  }
});

// GET detalha uma versao especifica
app.get('/api/state/:scope/versions/:versionId', requireSupabaseAuth, requireOwnScope, async (req, res) => {
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
    logError('APP_STATE_VERSION_FETCH_FAILED', err, { route: '/api/state/:scope/versions/:versionId' });
    res.status(500).json({ error: 'Erro ao buscar versao do estado' });
  }
});

// POST restaura uma versao e a torna estado atual
app.post('/api/state/:scope/versions/:versionId/restore', requireSupabaseAuth, requireOwnScope, rateLimitWrites, async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { scope, versionId } = req.params;
    await client.query('BEGIN');
    transactionStarted = true;

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
    const validationError = validateSnapshotState(restoredState);
    if (validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validationError });
    }

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
    await pruneStateVersions(client, scope);

    await client.query('COMMIT');
    transactionStarted = false;
    res.json(currentResult.rows[0]);
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    logError('APP_STATE_VERSION_RESTORE_FAILED', err, { route: '/api/state/:scope/versions/:versionId/restore' });
    res.status(500).json({ error: 'Erro ao restaurar versao do estado' });
  } finally {
    client.release();
  }
});

// Start server
await ensureRedisRateLimitReady();

app.listen(port, host || undefined, () => {
  logInfo('SERVER_STARTED', {
    url: `http://${host || 'localhost'}:${port}`,
    localOnly: !isProduction
  });
});
