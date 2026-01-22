import { apifyClient } from './client';
import { nanoid } from 'nanoid';
import type { NewAd, NewAdvertiser } from '../db/schema';

// Using the TikTok Creative Center Top Ads Scraper
// https://apify.com/codebyte/tiktok-creative-center-top-ads
const TIKTOK_ACTOR_ID = 'codebyte/tiktok-creative-center-top-ads';

export interface TikTokScrapeInput {
  keyword?: string;
  region?: string;
  period?: '7' | '30' | '180'; // days
  orderBy?: 'popular' | 'ctr' | 'cvr' | 'impression' | 'like';
  adFormat?: 'ALL' | 'SINGLE_VIDEO' | 'IMAGE' | 'CAROUSEL';
  maxItems?: number;
}

export interface TikTokAdResult {
  id: string;
  advertiserName?: string;
  advertiserId?: string;
  videoUrl?: string;
  videoPreviewUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  hashtags?: string[];
  likes?: number;
  comments?: number;
  shares?: number;
  impressions?: number;
  ctr?: number;
  reach?: number;
  duration?: number;
  region?: string;
  industry?: string;
  objective?: string;
  landingPageUrl?: string;
  firstSeen?: string;
  lastSeen?: string;
}

/**
 * Start a TikTok Creative Center scrape
 */
export async function startTikTokScrape(input: TikTokScrapeInput): Promise<string> {
  const actorInput = {
    keyword: input.keyword,
    region: input.region || 'US',
    period: input.period || '30',
    orderBy: input.orderBy || 'popular',
    adFormat: input.adFormat || 'ALL',
    maxItems: input.maxItems || 100,
    includeDetails: true,
  };

  const { data } = await apifyClient.runActor(TIKTOK_ACTOR_ID, actorInput);
  return data.id;
}

/**
 * Get results from a completed TikTok scrape
 */
export async function getTikTokScrapeResults(runId: string): Promise<{
  status: string;
  ads: NewAd[];
  advertisers: NewAdvertiser[];
}> {
  const { status, results } = await apifyClient.waitForRunAndGetResults<TikTokAdResult>(runId);

  if (status !== 'completed' || results.length === 0) {
    return { status, ads: [], advertisers: [] };
  }

  // Normalize results to our schema
  const advertiserMap = new Map<string, NewAdvertiser>();
  const ads: NewAd[] = [];

  for (const result of results) {
    // Create or update advertiser
    const advertiserId = result.advertiserId || `tiktok_${nanoid(8)}`;
    if (result.advertiserName && !advertiserMap.has(advertiserId)) {
      advertiserMap.set(advertiserId, {
        id: advertiserId,
        platform: 'tiktok',
        name: result.advertiserName,
        pageUrl: null,
        firstSeenAt: new Date().toISOString(),
        lastScrapedAt: new Date().toISOString(),
        isTracked: false,
      });
    }

    // Determine media type
    let mediaType: 'image' | 'video' | 'carousel' = 'video';
    const mediaUrls: string[] = [];

    if (result.videoUrl) {
      mediaUrls.push(result.videoUrl);
    }
    if (result.videoPreviewUrl) {
      mediaUrls.push(result.videoPreviewUrl);
    }

    // Calculate days running if we have date info
    let daysRunning: number | undefined;
    if (result.firstSeen) {
      const startDate = new Date(result.firstSeen);
      const endDate = result.lastSeen ? new Date(result.lastSeen) : new Date();
      daysRunning = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Build body text from caption and hashtags
    let bodyText = result.caption || '';
    if (result.hashtags && result.hashtags.length > 0) {
      bodyText += '\n\n' + result.hashtags.map((h) => `#${h}`).join(' ');
    }

    ads.push({
      id: nanoid(),
      platform: 'tiktok',
      advertiserId: result.advertiserName ? advertiserId : null,
      externalId: result.id,
      headline: null, // TikTok ads don't have headlines
      bodyText: bodyText || null,
      ctaText: result.objective || null,
      landingUrl: result.landingPageUrl || null,
      mediaType,
      mediaUrls: JSON.stringify(mediaUrls),
      thumbnailUrl: result.thumbnailUrl || null,
      impressionsMin: result.impressions || null,
      impressionsMax: result.impressions || null,
      likes: result.likes || null,
      comments: result.comments || null,
      shares: result.shares || null,
      daysRunning: daysRunning || null,
      countryTargeting: result.region ? JSON.stringify([result.region]) : null,
      firstSeenAt: result.firstSeen || null,
      lastSeenAt: result.lastSeen || null,
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
