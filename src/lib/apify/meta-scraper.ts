import { apifyClient } from './client';
import { nanoid } from 'nanoid';
import type { NewAd, NewAdvertiser } from '../db/schema';

// Using the Facebook Ads Library Scraper by curious_coder
// https://apify.com/curious_coder/facebook-ads-library-scraper
const META_ACTOR_ID = 'curious_coder/facebook-ads-library-scraper';

export interface MetaScrapeInput {
  searchTerm?: string;
  pageIds?: string[];
  country?: string;
  mediaType?: 'ALL' | 'IMAGE' | 'VIDEO' | 'MEME' | 'NONE';
  activeStatus?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  maxItems?: number;
}

export interface MetaAdResult {
  id: string;
  pageId: string;
  pageName: string;
  pageProfilePictureUrl?: string;
  pageUrl?: string;
  adArchiveId: string;
  adCreativeBody?: string;
  adCreativeLinkCaption?: string;
  adCreativeLinkDescription?: string;
  adCreativeLinkTitle?: string;
  callToActionType?: string;
  adDeliveryStartTime?: string;
  adDeliveryStopTime?: string;
  estimatedAudienceSize?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  impressions?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  spend?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  currency?: string;
  images?: Array<{
    url: string;
    resizedUrl?: string;
  }>;
  videos?: Array<{
    videoHd?: string;
    videoSd?: string;
    videoPreviewImageUrl?: string;
  }>;
  targetLocations?: string[];
  targetAges?: string;
  targetGenders?: string;
  publisherPlatforms?: string[];
}

/**
 * Build a Facebook Ads Library search URL from parameters
 */
function buildFbAdsLibraryUrl(input: MetaScrapeInput): string {
  const baseUrl = 'https://www.facebook.com/ads/library/';
  const params = new URLSearchParams();

  // Map our activeStatus to FB's active_status
  const activeStatusMap: Record<string, string> = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ALL: 'all',
  };
  params.set('active_status', activeStatusMap[input.activeStatus || 'ACTIVE'] || 'active');

  // Ad type - always 'all' for now
  params.set('ad_type', 'all');

  // Country
  params.set('country', input.country || 'US');

  // Search term
  if (input.searchTerm) {
    params.set('q', input.searchTerm);
    params.set('search_type', 'keyword_unordered');
  }

  // Map our mediaType to FB's media_type
  const mediaTypeMap: Record<string, string> = {
    ALL: 'all',
    IMAGE: 'image',
    VIDEO: 'video',
    MEME: 'meme',
    NONE: 'none',
  };
  params.set('media_type', mediaTypeMap[input.mediaType || 'ALL'] || 'all');

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Start a Meta Ads Library scrape
 */
export async function startMetaScrape(input: MetaScrapeInput): Promise<string> {
  // Build URLs array based on input
  const urls: Array<{ url: string } | string> = [];

  // If searching by keyword, build a search URL
  if (input.searchTerm) {
    urls.push({ url: buildFbAdsLibraryUrl(input) });
  }

  // If searching by page IDs, add page URLs
  if (input.pageIds && input.pageIds.length > 0) {
    for (const pageId of input.pageIds) {
      // Handle both page IDs and full URLs
      if (pageId.startsWith('http')) {
        urls.push({ url: pageId });
      } else {
        urls.push({ url: `https://www.facebook.com/${pageId}` });
      }
    }
  }

  const actorInput = {
    urls,
    count: input.maxItems || 100,
    'scrapePageAds.activeStatus': input.activeStatus?.toLowerCase() || 'active',
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL'],
      apifyProxyCountry: input.country || 'US',
    },
  };

  const { data } = await apifyClient.runActor(META_ACTOR_ID, actorInput);
  return data.id;
}

/**
 * Get results from a completed Meta scrape
 */
export async function getMetaScrapeResults(runId: string): Promise<{
  status: string;
  ads: NewAd[];
  advertisers: NewAdvertiser[];
}> {
  const { status, results } = await apifyClient.waitForRunAndGetResults<MetaAdResult>(runId);

  if (status !== 'completed' || results.length === 0) {
    return { status, ads: [], advertisers: [] };
  }

  // Normalize results to our schema
  const advertiserMap = new Map<string, NewAdvertiser>();
  const ads: NewAd[] = [];

  for (const result of results) {
    // Create or update advertiser
    if (!advertiserMap.has(result.pageId)) {
      advertiserMap.set(result.pageId, {
        id: result.pageId,
        platform: 'meta',
        name: result.pageName,
        pageUrl: result.pageUrl || `https://facebook.com/${result.pageId}`,
        firstSeenAt: new Date().toISOString(),
        lastScrapedAt: new Date().toISOString(),
        isTracked: false,
      });
    }

    // Determine media type and URLs
    let mediaType: 'image' | 'video' | 'carousel' = 'image';
    const mediaUrls: string[] = [];
    let thumbnailUrl: string | undefined;

    if (result.videos && result.videos.length > 0) {
      mediaType = 'video';
      for (const video of result.videos) {
        if (video.videoHd) mediaUrls.push(video.videoHd);
        else if (video.videoSd) mediaUrls.push(video.videoSd);
        if (!thumbnailUrl && video.videoPreviewImageUrl) {
          thumbnailUrl = video.videoPreviewImageUrl;
        }
      }
    } else if (result.images && result.images.length > 0) {
      mediaType = result.images.length > 1 ? 'carousel' : 'image';
      for (const image of result.images) {
        mediaUrls.push(image.url);
      }
      thumbnailUrl = result.images[0]?.resizedUrl || result.images[0]?.url;
    }

    // Calculate days running
    let daysRunning: number | undefined;
    if (result.adDeliveryStartTime) {
      const startDate = new Date(result.adDeliveryStartTime);
      const endDate = result.adDeliveryStopTime
        ? new Date(result.adDeliveryStopTime)
        : new Date();
      daysRunning = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    ads.push({
      id: nanoid(),
      platform: 'meta',
      advertiserId: result.pageId,
      externalId: result.adArchiveId,
      headline: result.adCreativeLinkTitle || null,
      bodyText: result.adCreativeBody || null,
      ctaText: result.callToActionType || null,
      landingUrl: result.adCreativeLinkCaption || null,
      mediaType,
      mediaUrls: JSON.stringify(mediaUrls),
      thumbnailUrl: thumbnailUrl || null,
      impressionsMin: result.impressions?.lower_bound || null,
      impressionsMax: result.impressions?.upper_bound || null,
      likes: null,
      comments: null,
      shares: null,
      daysRunning: daysRunning || null,
      countryTargeting: result.targetLocations
        ? JSON.stringify(result.targetLocations)
        : null,
      firstSeenAt: result.adDeliveryStartTime || null,
      lastSeenAt: result.adDeliveryStopTime || null,
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
export async function checkMetaScrapeStatus(runId: string): Promise<{
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
