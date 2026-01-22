import { apifyClient } from './client';
import { nanoid } from 'nanoid';
import type { NewAd, NewAdvertiser } from '../db/schema';

// Using Apify's Instagram Scraper
// https://apify.com/apify/instagram-scraper
const INSTAGRAM_ACTOR_ID = 'apify/instagram-scraper';

export interface InstagramScrapeInput {
  // Search options
  search?: string;                    // Search query
  searchType?: 'hashtag' | 'user' | 'place';
  hashtags?: string[];               // Direct hashtags to scrape
  usernames?: string[];              // Direct profiles to scrape
  directUrls?: string[];             // Direct post/reel URLs

  // Filters
  resultsLimit?: number;
  searchLimit?: number;              // Limit search results
}

// Output structure from apify/instagram-scraper
export interface InstagramPostResult {
  id: string;
  shortCode?: string;
  type?: 'Image' | 'Video' | 'Sidecar';  // Sidecar = carousel
  url?: string;                           // Post URL
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  commentsCount?: number;
  likesCount?: number;
  viewsCount?: number;                    // For videos
  timestamp?: string;
  displayUrl?: string;                    // Main image/thumbnail
  videoUrl?: string;
  images?: string[];                      // For carousels
  childPosts?: Array<{
    type?: string;
    displayUrl?: string;
    videoUrl?: string;
  }>;
  ownerUsername?: string;
  ownerFullName?: string;
  ownerId?: string;
  isSponsored?: boolean;
  locationName?: string;
  locationId?: string;
  productType?: string;                   // 'feed', 'reels', 'igtv'
  videoDuration?: number;
}

/**
 * Start an Instagram content scrape
 */
export async function startInstagramScrape(input: InstagramScrapeInput): Promise<string> {
  const actorInput: Record<string, unknown> = {
    resultsLimit: input.resultsLimit || 50,
  };

  // Search mode
  if (input.search) {
    actorInput.search = input.search;
    actorInput.searchType = input.searchType || 'hashtag';
    actorInput.searchLimit = input.searchLimit || 10;
  }

  // Direct hashtags
  if (input.hashtags && input.hashtags.length > 0) {
    actorInput.hashtags = input.hashtags.map(h => h.replace('#', ''));
  }

  // Direct usernames/profiles
  if (input.usernames && input.usernames.length > 0) {
    actorInput.usernames = input.usernames.map(u => u.replace('@', ''));
  }

  // Direct URLs
  if (input.directUrls && input.directUrls.length > 0) {
    actorInput.directUrls = input.directUrls;
  }

  // Results type - get posts
  actorInput.resultsType = 'posts';

  const { data } = await apifyClient.runActor(INSTAGRAM_ACTOR_ID, actorInput);
  return data.id;
}

/**
 * Get results from a completed Instagram scrape
 */
export async function getInstagramScrapeResults(runId: string): Promise<{
  status: string;
  ads: NewAd[];
  advertisers: NewAdvertiser[];
}> {
  const { status, results } = await apifyClient.waitForRunAndGetResults<InstagramPostResult>(runId);

  console.log('Instagram scrape results count:', results.length);
  if (results.length > 0) {
    console.log('Sample result:', JSON.stringify(results[0], null, 2).substring(0, 500));
  }

  if (status !== 'completed' || results.length === 0) {
    return { status, ads: [], advertisers: [] };
  }

  // Normalize results to our schema
  const advertiserMap = new Map<string, NewAdvertiser>();
  const ads: NewAd[] = [];

  for (const result of results) {
    // Create advertiser from owner info
    const advertiserId = result.ownerId || result.ownerUsername || `ig_${nanoid(8)}`;

    if (result.ownerUsername && !advertiserMap.has(advertiserId)) {
      advertiserMap.set(advertiserId, {
        id: advertiserId,
        platform: 'instagram',
        name: result.ownerFullName || result.ownerUsername,
        pageUrl: `https://instagram.com/${result.ownerUsername}`,
        firstSeenAt: new Date().toISOString(),
        lastScrapedAt: new Date().toISOString(),
        isTracked: false,
      });
    }

    // Determine media type and URLs
    let mediaType: 'image' | 'video' | 'carousel' = 'image';
    const mediaUrls: string[] = [];

    if (result.type === 'Video' || result.videoUrl) {
      mediaType = 'video';
      if (result.videoUrl) mediaUrls.push(result.videoUrl);
    } else if (result.type === 'Sidecar' || (result.childPosts && result.childPosts.length > 0)) {
      mediaType = 'carousel';
      if (result.childPosts) {
        for (const child of result.childPosts) {
          if (child.videoUrl) mediaUrls.push(child.videoUrl);
          else if (child.displayUrl) mediaUrls.push(child.displayUrl);
        }
      }
    }

    if (result.displayUrl && !mediaUrls.includes(result.displayUrl)) {
      mediaUrls.unshift(result.displayUrl);
    }

    if (result.images) {
      for (const img of result.images) {
        if (!mediaUrls.includes(img)) mediaUrls.push(img);
      }
    }

    // Calculate days since posted
    let daysRunning: number | undefined;
    if (result.timestamp) {
      const postDate = new Date(result.timestamp);
      daysRunning = Math.ceil(
        (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Build body text from caption
    let bodyText = result.caption || '';
    if (result.hashtags && result.hashtags.length > 0) {
      const tags = result.hashtags.map(h => `#${h}`).join(' ');
      if (!bodyText.toLowerCase().includes(tags.toLowerCase())) {
        bodyText += '\n\n' + tags;
      }
    }

    ads.push({
      id: nanoid(),
      platform: 'instagram',
      advertiserId: result.ownerUsername ? advertiserId : null,
      externalId: result.shortCode || result.id,
      headline: result.ownerFullName || result.ownerUsername || null,
      bodyText: bodyText || null,
      ctaText: result.isSponsored ? 'Sponsored' : null,
      landingUrl: result.url || `https://instagram.com/p/${result.shortCode}`,
      mediaType,
      mediaUrls: JSON.stringify(mediaUrls),
      thumbnailUrl: result.displayUrl || null,
      impressionsMin: result.viewsCount || null,
      impressionsMax: result.viewsCount || null,
      likes: result.likesCount || null,
      comments: result.commentsCount || null,
      shares: null,
      daysRunning: daysRunning || null,
      countryTargeting: result.locationName ? JSON.stringify([result.locationName]) : null,
      firstSeenAt: result.timestamp || null,
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
export async function checkInstagramScrapeStatus(runId: string): Promise<{
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
