import { Pool } from 'pg';
import { accountingEngine, AppState } from '../../src/db/concurrencyEngine.ts';
import { IntegrationsConfig } from '../../src/types/integrations.ts';

let cachedPool: Pool | null = null;
let tablesInitialized = false;

// In-memory fallback for integrations when DB is not yet connected
let memoryIntegrations: IntegrationsConfig = {
  activeAiProvider: (process.env.ACTIVE_AI_PROVIDER as any) || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini'),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  gmailUser: process.env.GMAIL_USER || '',
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
  fromName: process.env.GMAIL_FROM_NAME || 'AI Munim Accounts',
  appUrl: process.env.APP_URL || 'http://localhost:3000'
};

export function getDbPool(): Pool | null {
  const connString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || memoryIntegrations.databaseUrl;
  if (!connString) {
    return null;
  }

  if (!cachedPool) {
    try {
      cachedPool = new Pool({
        connectionString: connString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
      cachedPool.on('error', (err) => {
        console.error('[Neon Pool Error]', err);
        cachedPool = null;
      });
    } catch (err) {
      console.warn('[Neon Pool Init Failed]', err);
      return null;
    }
  }

  return cachedPool;
}

export async function initTables(pool: Pool): Promise<void> {
  if (tablesInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_munim_state (
        id VARCHAR(64) PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ai_munim_integrations (
        id VARCHAR(64) PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    tablesInitialized = true;
  } catch (err) {
    console.error('[DB Init Tables Error]', err);
  }
}

export async function getAppState(): Promise<AppState> {
  const pool = getDbPool();
  if (!pool) {
    return accountingEngine.getState();
  }

  try {
    await initTables(pool);
    const res = await pool.query('SELECT state FROM ai_munim_state WHERE id = $1', ['live_state']);
    if (res.rows.length > 0 && res.rows[0].state) {
      const dbState = res.rows[0].state as AppState;
      accountingEngine.setState(dbState);
      return dbState;
    } else {
      // Seed initial state into DB
      const initialState = accountingEngine.getState();
      await pool.query(
        `INSERT INTO ai_munim_state (id, state, updated_at)
         VALUES ('live_state', $1, NOW())
         ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
        [JSON.stringify(initialState)]
      );
      return initialState;
    }
  } catch (err) {
    console.warn('[DB getAppState Failed, falling back to memory]', err);
    return accountingEngine.getState();
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  accountingEngine.setState(state);
  const pool = getDbPool();
  if (!pool) return;

  try {
    await initTables(pool);
    await pool.query(
      `INSERT INTO ai_munim_state (id, state, updated_at)
       VALUES ('live_state', $1, NOW())
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [JSON.stringify(state)]
    );
  } catch (err) {
    console.error('[DB saveAppState Failed]', err);
  }
}

export async function getIntegrations(): Promise<IntegrationsConfig> {
  const pool = getDbPool();
  if (!pool) {
    return { ...memoryIntegrations };
  }

  try {
    await initTables(pool);
    const res = await pool.query('SELECT config FROM ai_munim_integrations WHERE id = $1', ['active_config']);
    if (res.rows.length > 0 && res.rows[0].config) {
      const dbConfig = res.rows[0].config as IntegrationsConfig;
      memoryIntegrations = {
        ...memoryIntegrations,
        ...dbConfig,
        // Environment variables take precedence if present
        geminiApiKey: process.env.GEMINI_API_KEY || dbConfig.geminiApiKey || '',
        openaiApiKey: process.env.OPENAI_API_KEY || dbConfig.openaiApiKey || '',
        cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || dbConfig.cloudinaryCloudName || '',
        cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || dbConfig.cloudinaryApiKey || '',
        cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || dbConfig.cloudinaryApiSecret || '',
        gmailUser: process.env.GMAIL_USER || dbConfig.gmailUser || '',
        gmailAppPassword: process.env.GMAIL_APP_PASSWORD || dbConfig.gmailAppPassword || '',
        databaseUrl: process.env.DATABASE_URL || dbConfig.databaseUrl || ''
      };
      return memoryIntegrations;
    }
  } catch (err) {
    console.warn('[DB getIntegrations Failed, using memory]', err);
  }
  return { ...memoryIntegrations };
}

export async function saveIntegrations(config: Partial<IntegrationsConfig>): Promise<IntegrationsConfig> {
  memoryIntegrations = {
    ...memoryIntegrations,
    ...config
  };

  const pool = getDbPool();
  if (pool) {
    try {
      await initTables(pool);
      await pool.query(
        `INSERT INTO ai_munim_integrations (id, config, updated_at)
         VALUES ('active_config', $1, NOW())
         ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        [JSON.stringify(memoryIntegrations)]
      );
    } catch (err) {
      console.error('[DB saveIntegrations Failed]', err);
    }
  }

  return memoryIntegrations;
}

