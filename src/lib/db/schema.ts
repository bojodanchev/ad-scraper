import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Advertisers/Creators we're tracking
export const advertisers = sqliteTable('advertisers', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(), // 'meta' | 'tiktok' | 'instagram'
  name: text('name').notNull(),
  username: text('username'), // @handle without @
  pageUrl: text('page_url'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  verified: integer('verified', { mode: 'boolean' }).default(false),

  // Creator Stats (from platform data)
  followerCount: integer('follower_count'),
  followingCount: integer('following_count'),
  totalLikes: integer('total_likes'), // Total likes received (heartCount on TikTok)
  postsCount: integer('posts_count'),

  // Calculated Metrics (updated on scrape)
  avgLikesPerPost: integer('avg_likes_per_post'),
  avgViewsPerPost: integer('avg_views_per_post'),
  avgCommentsPerPost: integer('avg_comments_per_post'),
  engagementRate: text('engagement_rate'), // Stored as decimal string for precision

  firstSeenAt: text('first_seen_at'),
  lastScrapedAt: text('last_scraped_at'),
  isTracked: integer('is_tracked', { mode: 'boolean' }).default(false),
});

// Historical creator stats for tracking growth over time
export const creatorStats = sqliteTable('creator_stats', {
  id: text('id').primaryKey(),
  advertiserId: text('advertiser_id')
    .notNull()
    .references(() => advertisers.id),
  recordedAt: text('recorded_at').notNull(), // ISO timestamp

  // Snapshot of stats at this point
  followerCount: integer('follower_count'),
  followingCount: integer('following_count'),
  totalLikes: integer('total_likes'),
  postsCount: integer('posts_count'),

  // Derived metrics
  followerGrowth: integer('follower_growth'), // Change since last record
  engagementRate: text('engagement_rate'),
});

// The ads themselves
export const ads = sqliteTable('ads', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(), // 'meta' | 'tiktok'
  advertiserId: text('advertiser_id').references(() => advertisers.id),
  externalId: text('external_id'), // platform's ad ID

  // Content
  headline: text('headline'),
  bodyText: text('body_text'),
  ctaText: text('cta_text'),
  landingUrl: text('landing_url'),
  mediaType: text('media_type'), // 'image' | 'video' | 'carousel'
  mediaUrls: text('media_urls'), // JSON array of URLs
  thumbnailUrl: text('thumbnail_url'),

  // Metrics (what's available)
  impressionsMin: integer('impressions_min'),
  impressionsMax: integer('impressions_max'),
  likes: integer('likes'),
  comments: integer('comments'),
  shares: integer('shares'),
  daysRunning: integer('days_running'),

  // Metadata
  countryTargeting: text('country_targeting'), // JSON array
  firstSeenAt: text('first_seen_at'),
  lastSeenAt: text('last_seen_at'),
  scrapedAt: text('scraped_at'),

  // AI Analysis (populated later)
  analysis: text('analysis'), // JSON blob with full breakdown
});

// Search/scrape history
export const scrapeJobs = sqliteTable('scrape_jobs', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(), // 'meta' | 'tiktok'
  searchType: text('search_type'), // 'keyword' | 'advertiser'
  query: text('query'),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  adsFound: integer('ads_found').default(0),
  apifyRunId: text('apify_run_id'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  error: text('error'),
});

// Saved collections / swipe files
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at'),
});

// Junction table for collections and ads
export const collectionAds = sqliteTable('collection_ads', {
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id),
  adId: text('ad_id')
    .notNull()
    .references(() => ads.id),
  notes: text('notes'),
  addedAt: text('added_at'),
});

// Types
export type Advertiser = typeof advertisers.$inferSelect;
export type NewAdvertiser = typeof advertisers.$inferInsert;

export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;

export type ScrapeJob = typeof scrapeJobs.$inferSelect;
export type NewScrapeJob = typeof scrapeJobs.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type CollectionAd = typeof collectionAds.$inferSelect;
export type NewCollectionAd = typeof collectionAds.$inferInsert;

export type CreatorStat = typeof creatorStats.$inferSelect;
export type NewCreatorStat = typeof creatorStats.$inferInsert;
