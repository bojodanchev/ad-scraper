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

// ============================================================================
// AD INTELLIGENCE (Historical Tracking, Audience Inference, Spend Estimation)
// ============================================================================

// Daily snapshots of ad metrics for historical tracking
export const adSnapshots = sqliteTable('ad_snapshots', {
  id: text('id').primaryKey(),
  adId: text('ad_id')
    .notNull()
    .references(() => ads.id),
  snapshotDate: text('snapshot_date').notNull(), // YYYY-MM-DD

  // Metrics at this point in time
  likes: integer('likes'),
  comments: integer('comments'),
  shares: integer('shares'),
  views: integer('views'),
  impressionsMin: integer('impressions_min'),
  impressionsMax: integer('impressions_max'),

  // Status tracking
  isActive: integer('is_active', { mode: 'boolean' }).default(true),

  createdAt: text('created_at'),
});

// AI-inferred audience targeting from creative analysis
export const audienceInference = sqliteTable('audience_inference', {
  id: text('id').primaryKey(),
  adId: text('ad_id')
    .notNull()
    .references(() => ads.id),

  // Inferred demographics
  inferredAgeMin: integer('inferred_age_min'),
  inferredAgeMax: integer('inferred_age_max'),
  inferredGender: text('inferred_gender'), // 'male' | 'female' | 'all'
  inferredIncomeLevel: text('inferred_income_level'), // 'low' | 'middle' | 'high' | 'affluent'

  // Inferred psychographics (JSON arrays)
  inferredInterests: text('inferred_interests'), // JSON array of interests
  inferredPainPoints: text('inferred_pain_points'), // JSON array
  inferredDesires: text('inferred_desires'), // JSON array

  // Inferred targeting parameters
  inferredNiche: text('inferred_niche'), // 'ecommerce' | 'saas' | 'finance' | 'health' | etc.
  inferredBuyerType: text('inferred_buyer_type'), // 'impulse' | 'considered' | 'b2b'

  // Analysis metadata
  confidence: text('confidence'), // 0-1 decimal as string
  rawAnalysis: text('raw_analysis'), // Full Gemini response
  analyzedAt: text('analyzed_at'),
});

// Spend estimation based on signals
export const spendEstimates = sqliteTable('spend_estimates', {
  id: text('id').primaryKey(),
  adId: text('ad_id')
    .notNull()
    .references(() => ads.id),

  // Time-based metrics
  daysRunning: integer('days_running'),
  firstSeen: text('first_seen'),
  lastSeen: text('last_seen'),

  // Spend estimates (stored as strings for precision)
  estimatedDailySpendMin: text('estimated_daily_spend_min'),
  estimatedDailySpendMax: text('estimated_daily_spend_max'),
  estimatedTotalSpendMin: text('estimated_total_spend_min'),
  estimatedTotalSpendMax: text('estimated_total_spend_max'),

  // Scaling signals
  variantCount: integer('variant_count'), // Number of ad variants detected
  isScaling: integer('is_scaling', { mode: 'boolean' }).default(false),
  scalingSignals: text('scaling_signals'), // JSON array of signals detected

  // Estimation metadata
  cpmBenchmarkUsed: text('cpm_benchmark_used'), // CPM used for calculation
  niche: text('niche'), // Niche used for CPM lookup
  confidence: text('confidence'), // 'low' | 'medium' | 'high'
  estimatedAt: text('estimated_at'),
});

// Competitors being tracked
export const trackedCompetitors = sqliteTable('tracked_competitors', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(), // 'meta' | 'tiktok' | 'instagram'

  // Identifier
  pageId: text('page_id'), // Platform-specific page/account ID
  pageName: text('page_name').notNull(),
  pageUrl: text('page_url'),
  avatarUrl: text('avatar_url'),

  // Tracking metadata
  trackingSince: text('tracking_since'),
  lastChecked: text('last_checked'),
  lastNewAdFound: text('last_new_ad_found'),

  // Stats
  totalAdsTracked: integer('total_ads_tracked').default(0),
  activeAdsCount: integer('active_ads_count').default(0),

  // Alerts (JSON array of alert configs)
  alertsEnabled: integer('alerts_enabled', { mode: 'boolean' }).default(true),
  alertConfig: text('alert_config'), // JSON: { onNewAd: true, onScaling: true, etc. }

  // Notes
  notes: text('notes'),
  tags: text('tags'), // JSON array of tags for organization

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at'),
});

// Winner status tracking (could be on ads table but separate for flexibility)
export const adWinnerStatus = sqliteTable('ad_winner_status', {
  id: text('id').primaryKey(),
  adId: text('ad_id')
    .notNull()
    .references(() => ads.id),

  // Winner scoring
  isWinner: integer('is_winner', { mode: 'boolean' }).default(false),
  winnerScore: text('winner_score'), // 0-1 probability

  // Criteria met (JSON)
  criteriaMet: text('criteria_met'), // { daysRunning: true, highEngagement: true, etc. }

  // Timestamps
  evaluatedAt: text('evaluated_at'),
  becameWinnerAt: text('became_winner_at'),
});

// Types
export type Advertiser = typeof advertisers.$inferSelect;
export type NewAdvertiser = typeof advertisers.$inferInsert;

export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;

// Intelligence types
export type AdSnapshot = typeof adSnapshots.$inferSelect;
export type NewAdSnapshot = typeof adSnapshots.$inferInsert;

export type AudienceInference = typeof audienceInference.$inferSelect;
export type NewAudienceInference = typeof audienceInference.$inferInsert;

export type SpendEstimate = typeof spendEstimates.$inferSelect;
export type NewSpendEstimate = typeof spendEstimates.$inferInsert;

export type TrackedCompetitor = typeof trackedCompetitors.$inferSelect;
export type NewTrackedCompetitor = typeof trackedCompetitors.$inferInsert;

export type AdWinnerStatus = typeof adWinnerStatus.$inferSelect;
export type NewAdWinnerStatus = typeof adWinnerStatus.$inferInsert;

export type ScrapeJob = typeof scrapeJobs.$inferSelect;
export type NewScrapeJob = typeof scrapeJobs.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type CollectionAd = typeof collectionAds.$inferSelect;
export type NewCollectionAd = typeof collectionAds.$inferInsert;

export type CreatorStat = typeof creatorStats.$inferSelect;
export type NewCreatorStat = typeof creatorStats.$inferInsert;

// ============================================================================
// VIDEO AD GENERATION (Dual-Platform: TopView + Higgsfield)
// ============================================================================

// Track video generation jobs across both platforms
export const generationJobs = sqliteTable('generation_jobs', {
  id: text('id').primaryKey(),
  sourceAdId: text('source_ad_id').references(() => ads.id), // Optional: linked scraped ad

  // DUAL-PLATFORM TRACKING
  platform: text('platform'), // 'topview' | 'higgsfield'
  model: text('model'), // Model used (higgsfield models or 'topview-url', 'topview-avatar', etc.)

  // Job status and type
  status: text('status').notNull(), // 'pending' | 'generating' | 'review' | 'approved' | 'rejected' | 'failed'
  inputType: text('input_type'), // 'url-to-video' | 'image-to-video' | 'text-to-video' | 'avatar' | 'product-avatar' | 'remix'
  inputData: text('input_data'), // JSON: { productUrl, imageUrl, avatarId, script, prompt, offer }

  // Platform-specific tracking IDs
  topviewTaskId: text('tv_task_id'), // TopView task tracking
  higgsfieldRequestId: text('hf_request_id'), // Higgsfield tracking

  // Results
  outputVideoUrl: text('output_video_url'),
  previewUrl: text('preview_url'), // TopView preview thumbnails
  generatedAt: text('generated_at'),
  reviewedAt: text('reviewed_at'),
  reviewNotes: text('review_notes'),

  // Cost tracking
  creditsUsed: integer('credits_used'),
  estimatedCostUsd: text('estimated_cost_usd'),

  // Error tracking
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),

  // Timestamps
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// Queue for pending generation jobs
export const generationQueue = sqliteTable('generation_queue', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => generationJobs.id),
  platform: text('platform'), // 'topview' | 'higgsfield' - for routing
  priority: integer('priority').default(0), // Higher = more urgent
  scheduledFor: text('scheduled_for'), // ISO timestamp for delayed execution
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  lastAttemptAt: text('last_attempt_at'),
  lastError: text('last_error'),
  createdAt: text('created_at'),
});

// Track TopView avatars for reuse
export const topviewAvatars = sqliteTable('topview_avatars', {
  id: text('id').primaryKey(),
  topviewAvatarId: text('tv_avatar_id'), // TopView's avatar ID
  name: text('name'),
  description: text('description'),
  sourceVideoUrl: text('source_video_url'), // Original video used to create avatar
  previewUrl: text('preview_url'),
  gender: text('gender'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at'),
});

// Track script remixes and variations
export const scriptRemixes = sqliteTable('script_remixes', {
  id: text('id').primaryKey(),
  sourceAdId: text('source_ad_id').references(() => ads.id),
  originalScript: text('original_script'),
  remixedScript: text('remixed_script'),
  offer: text('offer'), // The product/offer it was remixed for
  variations: text('variations'), // JSON array of variation scripts
  analysisData: text('analysis_data'), // JSON: hook, cta, emotional arc, etc.
  createdAt: text('created_at'),
});

// Types for generation system
export type GenerationJob = typeof generationJobs.$inferSelect;
export type NewGenerationJob = typeof generationJobs.$inferInsert;

export type GenerationQueueItem = typeof generationQueue.$inferSelect;
export type NewGenerationQueueItem = typeof generationQueue.$inferInsert;

export type TopviewAvatar = typeof topviewAvatars.$inferSelect;
export type NewTopviewAvatar = typeof topviewAvatars.$inferInsert;

export type ScriptRemix = typeof scriptRemixes.$inferSelect;
export type NewScriptRemix = typeof scriptRemixes.$inferInsert;
