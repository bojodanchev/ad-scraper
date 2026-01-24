import { apifyClient } from './client';
import { nanoid } from 'nanoid';
import type { NewAd, NewAdvertiser } from '../db/schema';

// Using Clockworks TikTok Scraper for viral organic content
// https://apify.com/clockworks/tiktok-scraper
const TIKTOK_ACTOR_ID = 'clockworks/tiktok-scraper';

export interface TikTokScrapeInput {
  // Search options
  hashtags?: string[];        // Hashtags to search (without #)
  profiles?: string[];        // Usernames to scrape
  searchQueries?: string[];   // Search terms
  videoUrls?: string[];       // Direct video URLs

  // Filters
  sortBy?: 'latest' | 'oldest' | 'popular';
  maxItems?: number;

  // Time period filter (in days)
  timePeriodDays?: number;    // Filter to content within last N days

  // Creator filters (post-scrape filtering)
  minFollowers?: number;      // Minimum creator follower count
  maxFollowers?: number;      // Maximum creator follower count

  // Download options
  downloadVideos?: boolean;
  downloadCovers?: boolean;
}

// Output structure from clockworks/tiktok-scraper
export interface TikTokVideoResult {
  id: string;
  webVideoUrl?: string;
  videoUrl?: string;
  videoUrlNoWaterMark?: string;
  coverUrl?: string;
  dynamicCoverUrl?: string;
  text?: string;                    // Caption/description
  diggCount?: number;               // Likes
  commentCount?: number;
  shareCount?: number;
  playCount?: number;
  collectCount?: number;            // Saves
  createTime?: number;              // Unix timestamp
  createTimeISO?: string;
  duration?: number;                // Video length in seconds
  hashtags?: Array<{ name: string }>;
  author?: {
    id?: string;
    uniqueId?: string;              // Username
    nickname?: string;              // Display name
    avatarThumb?: string;
    signature?: string;             // Bio
    verified?: boolean;
    followerCount?: number;
    heartCount?: number;
  };
  music?: {
    id?: string;
    title?: string;
    authorName?: string;
    playUrl?: string;
  };
  locationCreated?: string;
}

/**
 * Start a TikTok content scrape for viral/trending videos
 */
export async function startTikTokScrape(input: TikTokScrapeInput): Promise<string> {
  const actorInput: Record<string, unknown> = {
    resultsPerPage: input.maxItems || 50,
    shouldDownloadVideos: input.downloadVideos || false,
    shouldDownloadCovers: input.downloadCovers || false,
  };

  // Add hashtags if provided
  if (input.hashtags && input.hashtags.length > 0) {
    actorInput.hashtags = input.hashtags.map(h => h.replace('#', ''));
  }

  // Add profiles if provided
  if (input.profiles && input.profiles.length > 0) {
    actorInput.profiles = input.profiles.map(p => p.replace('@', ''));
  }

  // Add search queries if provided - this is key for niche targeting!
  if (input.searchQueries && input.searchQueries.length > 0) {
    actorInput.searchQueries = input.searchQueries;
  }

  // Add video URLs if provided
  if (input.videoUrls && input.videoUrls.length > 0) {
    actorInput.postURLs = input.videoUrls;
  }

  // Sort option
  if (input.sortBy) {
    const sortMap: Record<string, number> = {
      latest: 0,
      oldest: 1,
      popular: 2,
    };
    actorInput.oldestFirst = sortMap[input.sortBy] || 0;
  }

  // Native date filtering - oldestPostDate parameter
  // This filters at scrape time to only get content within the time period
  if (input.timePeriodDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - input.timePeriodDays);
    // Format as ISO string (YYYY-MM-DD)
    actorInput.oldestPostDate = cutoffDate.toISOString().split('T')[0];
    console.log(`TikTok scrape with oldestPostDate: ${actorInput.oldestPostDate}`);
  }

  const { data } = await apifyClient.runActor(TIKTOK_ACTOR_ID, actorInput);
  return data.id;
}

export interface TikTokFilterOptions {
  timePeriodDays?: number;
  minFollowers?: number;
  maxFollowers?: number;
}

/**
 * Get results from a completed TikTok scrape
 * @param runId - Apify run ID
 * @param filters - Optional filters for time period and follower range
 */
export async function getTikTokScrapeResults(
  runId: string,
  filters?: TikTokFilterOptions | number // number for backwards compat (timePeriodDays)
): Promise<{
  status: string;
  ads: NewAd[];
  advertisers: NewAdvertiser[];
}> {
  // Handle backwards compatibility
  const filterOpts: TikTokFilterOptions = typeof filters === 'number'
    ? { timePeriodDays: filters }
    : filters || {};

  const { status, results: rawResults } = await apifyClient.waitForRunAndGetResults<TikTokVideoResult>(runId);

  console.log('TikTok scrape raw results count:', rawResults.length);
  if (rawResults.length > 0) {
    console.log('Sample result:', JSON.stringify(rawResults[0], null, 2).substring(0, 500));
  }

  if (status !== 'completed' || rawResults.length === 0) {
    return { status, ads: [], advertisers: [] };
  }

  // Apply filters
  let results = rawResults;

  // Filter by time period
  if (filterOpts.timePeriodDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filterOpts.timePeriodDays);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

    results = results.filter(r => {
      if (!r.createTime) return false;
      return r.createTime >= cutoffTimestamp;
    });

    console.log(`TikTok filtered to last ${filterOpts.timePeriodDays} days: ${results.length}/${rawResults.length} results`);
  }

  // Filter by follower range
  if (filterOpts.minFollowers !== undefined || filterOpts.maxFollowers !== undefined) {
    const beforeCount = results.length;
    results = results.filter(r => {
      const followers = r.author?.followerCount;
      if (followers === undefined || followers === null) return true; // Keep if no data

      if (filterOpts.minFollowers !== undefined && followers < filterOpts.minFollowers) {
        return false;
      }
      if (filterOpts.maxFollowers !== undefined && followers > filterOpts.maxFollowers) {
        return false;
      }
      return true;
    });

    console.log(`TikTok filtered by followers (${filterOpts.minFollowers || 0}-${filterOpts.maxFollowers || '∞'}): ${results.length}/${beforeCount} results`);
  }

  // Normalize results to our schema
  const advertiserMap = new Map<string, NewAdvertiser>();
  const ads: NewAd[] = [];

  for (const result of results) {
    // Create advertiser from author info
    const author = result.author;

    // Generate advertiser ID - prefer author.id, then uniqueId, skip if neither available
    let advertiserId: string | null = null;
    if (author?.id && author.id.trim() !== '') {
      advertiserId = author.id;
    } else if (author?.uniqueId && author.uniqueId.trim() !== '') {
      advertiserId = author.uniqueId;
    }

    if (advertiserId && author?.uniqueId && !advertiserMap.has(advertiserId)) {
      // Calculate engagement rate if we have follower count
      let engagementRate: string | null = null;
      if (author.followerCount && author.followerCount > 0 && result.playCount) {
        // TikTok engagement = (likes + comments + shares) / views * 100
        const engagement = (result.diggCount || 0) + (result.commentCount || 0) + (result.shareCount || 0);
        const rate = (engagement / result.playCount) * 100;
        engagementRate = rate.toFixed(2);
      }

      advertiserMap.set(advertiserId, {
        id: advertiserId,
        platform: 'tiktok',
        name: author.nickname || author.uniqueId,
        username: author.uniqueId,
        pageUrl: `https://tiktok.com/@${author.uniqueId}`,
        avatarUrl: author.avatarThumb || null,
        bio: author.signature || null,
        verified: author.verified || false,
        followerCount: author.followerCount || null,
        followingCount: null, // Not available from this scraper
        totalLikes: author.heartCount || null,
        postsCount: null, // Would need profile scrape
        avgLikesPerPost: null, // Calculated later from aggregated data
        avgViewsPerPost: null,
        avgCommentsPerPost: null,
        engagementRate,
        firstSeenAt: new Date().toISOString(),
        lastScrapedAt: new Date().toISOString(),
        isTracked: false,
      });
    }

    // Media URLs
    const mediaUrls: string[] = [];
    if (result.videoUrlNoWaterMark) mediaUrls.push(result.videoUrlNoWaterMark);
    else if (result.videoUrl) mediaUrls.push(result.videoUrl);
    if (result.webVideoUrl) mediaUrls.push(result.webVideoUrl);

    // Calculate days since posted
    let daysRunning: number | undefined;
    if (result.createTime) {
      const createDate = new Date(result.createTime * 1000);
      daysRunning = Math.ceil(
        (Date.now() - createDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Build body text from caption and hashtags
    let bodyText = result.text || '';
    if (result.hashtags && result.hashtags.length > 0) {
      const tags = result.hashtags.map(h => `#${h.name}`).join(' ');
      if (!bodyText.includes(tags)) {
        bodyText += '\n\n' + tags;
      }
    }

    ads.push({
      id: nanoid(),
      platform: 'tiktok',
      advertiserId: advertiserId, // null if no valid author ID
      externalId: result.id,
      headline: author?.nickname || null,  // Use creator name as "headline"
      bodyText: bodyText || null,
      ctaText: result.music?.title ? `Music: ${result.music.title}` : null,
      landingUrl: result.webVideoUrl || `https://tiktok.com/@${author?.uniqueId}/video/${result.id}`,
      mediaType: 'video',
      mediaUrls: JSON.stringify(mediaUrls),
      thumbnailUrl: result.coverUrl || result.dynamicCoverUrl || null,
      impressionsMin: result.playCount || null,
      impressionsMax: result.playCount || null,
      likes: result.diggCount || null,
      comments: result.commentCount || null,
      shares: result.shareCount || null,
      daysRunning: daysRunning || null,
      countryTargeting: result.locationCreated ? JSON.stringify([result.locationCreated]) : null,
      firstSeenAt: result.createTimeISO || null,
      lastSeenAt: null,
      scrapedAt: new Date().toISOString(),
      analysis: null,
    });
  }

  return {
    status,
    ads,
    advertisers: Array.from(advertiserMap.values()),
  };
}

/**
 * Quick check if scrape is still running
 */
export async function checkTikTokScrapeStatus(runId: string): Promise<{
  status: 'running' | 'completed' | 'failed';
  datasetId?: string;
}> {
  const { data } = await apifyClient.getRunStatus(runId);

  if (data.status === 'SUCCEEDED') {
    return { status: 'completed', datasetId: data.defaultDatasetId };
  }

  if (
    data.status === 'FAILED' ||
    data.status === 'ABORTED' ||
    data.status === 'TIMED-OUT'
  ) {
    return { status: 'failed' };
  }

  return { status: 'running' };
}
