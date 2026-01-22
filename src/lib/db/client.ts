import { createClient, Client } from '@libsql/client';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

// Lazy client initialization
let client: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL is not configured');
    }

    console.log('Creating Turso client with URL:', url.substring(0, 30) + '...');

    client = createClient({
      url: url.trim(), // Remove any whitespace/newlines
      authToken: authToken?.trim(),
    });
  }
  return client;
}

function getDb(): LibSQLDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}

// Proxy for lazy initialization
export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_, prop) {
    const realDb = getDb();
    const value = (realDb as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

// Initialize tables
export async function initializeDatabase() {
  const c = getClient();
  await c.execute(`
    CREATE TABLE IF NOT EXISTS advertisers (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      page_url TEXT,
      first_seen_at TEXT,
      last_scraped_at TEXT,
      is_tracked INTEGER DEFAULT 0
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      advertiser_id TEXT REFERENCES advertisers(id),
      external_id TEXT,
      headline TEXT,
      body_text TEXT,
      cta_text TEXT,
      landing_url TEXT,
      media_type TEXT,
      media_urls TEXT,
      thumbnail_url TEXT,
      impressions_min INTEGER,
      impressions_max INTEGER,
      likes INTEGER,
      comments INTEGER,
      shares INTEGER,
      days_running INTEGER,
      country_targeting TEXT,
      first_seen_at TEXT,
      last_seen_at TEXT,
      scraped_at TEXT,
      analysis TEXT
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS scrape_jobs (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      search_type TEXT,
      query TEXT,
      status TEXT NOT NULL,
      ads_found INTEGER DEFAULT 0,
      apify_run_id TEXT,
      started_at TEXT,
      completed_at TEXT,
      error TEXT
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS collection_ads (
      collection_id TEXT NOT NULL REFERENCES collections(id),
      ad_id TEXT NOT NULL REFERENCES ads(id),
      notes TEXT,
      added_at TEXT,
      PRIMARY KEY (collection_id, ad_id)
    )
  `);

  await c.execute(`CREATE INDEX IF NOT EXISTS idx_ads_platform ON ads(platform)`);
  await c.execute(`CREATE INDEX IF NOT EXISTS idx_ads_advertiser ON ads(advertiser_id)`);
  await c.execute(`CREATE INDEX IF NOT EXISTS idx_ads_scraped_at ON ads(scraped_at)`);
  await c.execute(`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status)`);
}

// Auto-initialize on first import
let initialized = false;
export async function ensureInitialized() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}
