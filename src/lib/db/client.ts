import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

let sqlite: Database.Database | null = null;
let drizzleDb: BetterSQLite3Database<typeof schema> | null = null;

function getDbPath() {
  return process.env.DATABASE_URL || path.join(process.cwd(), 'ads.db');
}

function initializeDatabase(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS advertisers (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      page_url TEXT,
      first_seen_at TEXT,
      last_scraped_at TEXT,
      is_tracked INTEGER DEFAULT 0
    );

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
    );

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
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS collection_ads (
      collection_id TEXT NOT NULL REFERENCES collections(id),
      ad_id TEXT NOT NULL REFERENCES ads(id),
      notes TEXT,
      added_at TEXT,
      PRIMARY KEY (collection_id, ad_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ads_platform ON ads(platform);
    CREATE INDEX IF NOT EXISTS idx_ads_advertiser ON ads(advertiser_id);
    CREATE INDEX IF NOT EXISTS idx_ads_scraped_at ON ads(scraped_at);
    CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
  `);
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!drizzleDb) {
    const dbPath = getDbPath();
    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    initializeDatabase(sqlite);
    drizzleDb = drizzle(sqlite, { schema });
  }
  return drizzleDb;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_, prop) {
    const database = getDb();
    const value = database[prop as keyof typeof database];
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
});
