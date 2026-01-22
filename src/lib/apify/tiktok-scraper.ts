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

  // Add search queries if provided
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

  const { data } = await apifyClient.runActor(TIKTOK_ACTOR_ID, actorInput);
  return data.id;
}

/**
 * Get results from a completed TikTok scrape
 * @param runId - Apify run ID
 * @param timePeriodDays - Optional filter to only include content from last N days
 */
export async function getTikTokScrapeResults(runId: string, timePeriodDays?: number): Promise<{
  status: string;
  ads: NewAd[];
  advertisers: NewAdvertiser[];
}> {
  const { status, results: rawResults } = await apifyClient.waitForRunAndGetResults<TikTokVideoResult>(runId);

  console.log('TikTok scrape raw results count:', rawResults.length);
  if (rawResults.length > 0) {
    console.log('Sample result:', JSON.stringify(rawResults[0], null, 2).substring(0, 500));
  }

  if (status !== 'completed' || rawResults.length === 0) {
    return { status, ads: [], advertisers: [] };
  }

  // Filter by time period if specified
  let results = rawResults;
  if (timePeriodDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timePeriodDays);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

    results = rawResults.filter(r => {
      if (!r.createTime) return false;
      return r.createTime >= cutoffTimestamp;
    });

    console.log(`TikTok filtered to last ${timePeriodDays} days: ${results.length}/${rawResults.length} results`);
  }

  // Normalize results to our schema
  const advertiserMap = new Map<string, NewAdvertiser>();
  const ads: NewAd[] = [];

  for (const result of results) {
    // Create advertiser from author info
    const author = result.author;
    const advertiserId = author?.id || author?.uniqueId || `tiktok_${nanoid(8)}`;

    if (author?.uniqueId && !advertiserMap.has(advertiserId)) {
      advertiserMap.set(advertiserId, {
        id: advertiserId,
        platform: 'tiktok',
        name: author.nickname || author.uniqueId,
        pageUrl: `https://tiktok.com/@${author.uniqueId}`,
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
      advertiserId: author?.uniqueId ? advertiserId : null,
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
