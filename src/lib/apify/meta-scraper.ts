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

  // Post-scrape filters
  minImpressions?: number;    // Minimum reach/impressions
  maxImpressions?: number;    // Maximum reach/impressions
}

// The actual response structure from curious_coder/facebook-ads-library-scraper
export interface MetaAdResult {
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  start_date: number; // Unix timestamp
  end_date: number;   // Unix timestamp
  start_date_formatted?: string;
  end_date_formatted?: string;
  publisher_platform?: string[];
  snapshot: {
    page_id: string;
    page_name: string;
    page_profile_uri?: string;
    page_profile_picture_url?: string;
    body?: { text?: string };
    title?: string;
    link_url?: string;
    link_description?: string;
    caption?: string;
    cta_text?: string;
    cta_type?: string;
    cards?: Array<{
      body?: string;
      title?: string;
      link_url?: string;
      link_description?: string;
      cta_text?: string;
      caption?: string;
      video_hd_url?: string;
      video_sd_url?: string;
      video_preview_image_url?: string;
      original_image_url?: string;
      resized_image_url?: string;
    }>;
    images?: Array<{
      original_image_url?: string;
      resized_image_url?: string;
    }>;
    videos?: Array<{
      video_hd_url?: string;
      video_sd_url?: string;
      video_preview_image_url?: string;
    }>;
  };
  impressions_with_index?: {
    impressions_text?: string;
    impressions_index?: number;
  };
  spend?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  reach_estimate?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  targeted_or_reached_countries?: string[];
  ad_library_url?: string;
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
    // Meta scraper requires minimum 10 items
    count: Math.max(input.maxItems || 100, 10),
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

export interface MetaFilterOptions {
  minImpressions?: number;
  maxImpressions?: number;
}

/**
 * Get results from a completed Meta scrape
 */
export async function getMetaScrapeResults(
  runId: string,
  filters?: MetaFilterOptions
): Promise<{
  status: string;
  ads: NewAd[];
  advertisers: NewAdvertiser[];
}> {
  const filterOpts = filters || {};

  const { status, results: rawResults } = await apifyClient.waitForRunAndGetResults<MetaAdResult>(runId);

  console.log('Meta scrape results count:', rawResults.length);
  if (rawResults.length > 0) {
    console.log('Sample result:', JSON.stringify(rawResults[0], null, 2).substring(0, 500));
  }

  if (status !== 'completed' || rawResults.length === 0) {
    return { status, ads: [], advertisers: [] };
  }

  // Apply filters
  let results = rawResults;

  // Filter by impressions range
  if (filterOpts.minImpressions !== undefined || filterOpts.maxImpressions !== undefined) {
    const beforeCount = results.length;
    results = results.filter(r => {
      const impressions = r.reach_estimate?.lower_bound || r.reach_estimate?.upper_bound || 0;
      if (filterOpts.minImpressions !== undefined && impressions < filterOpts.minImpressions) {
        return false;
      }
      if (filterOpts.maxImpressions !== undefined && impressions > filterOpts.maxImpressions) {
        return false;
      }
      return true;
    });
    console.log(`Meta filtered by impressions (${filterOpts.minImpressions || 0}-${filterOpts.maxImpressions || '∞'}): ${results.length}/${beforeCount} results`);
  }

  // Normalize results to our schema
  const advertiserMap = new Map<string, NewAdvertiser>();
  const ads: NewAd[] = [];

  for (const result of results) {
    // Skip if no page_id
    if (!result.page_id) {
      console.warn('Skipping result with no page_id');
      continue;
    }

    // Create or update advertiser
    if (!advertiserMap.has(result.page_id)) {
      advertiserMap.set(result.page_id, {
        id: result.page_id,
        platform: 'meta',
        name: result.page_name || result.snapshot?.page_name || 'Unknown',
        username: null, // Meta pages don't have usernames like TikTok/IG
        pageUrl: result.snapshot?.page_profile_uri || `https://facebook.com/${result.page_id}`,
        avatarUrl: result.snapshot?.page_profile_picture_url || null,
        bio: null, // Not available from Ads Library
        verified: false, // Not available from Ads Library
        followerCount: null, // Not available from Ads Library
        followingCount: null,
        totalLikes: null,
        postsCount: null,
        avgLikesPerPost: null,
        avgViewsPerPost: null,
        avgCommentsPerPost: null,
        engagementRate: null,
        firstSeenAt: new Date().toISOString(),
        lastScrapedAt: new Date().toISOString(),
        isTracked: false,
      });
    }

    // Determine media type and URLs from snapshot
    let mediaType: 'image' | 'video' | 'carousel' = 'image';
    const mediaUrls: string[] = [];
    let thumbnailUrl: string | undefined;

    const snapshot = result.snapshot;

    // Check cards first (most common)
    if (snapshot?.cards && snapshot.cards.length > 0) {
      const hasVideos = snapshot.cards.some(c => c.video_hd_url || c.video_sd_url);
      mediaType = hasVideos ? 'video' : (snapshot.cards.length > 1 ? 'carousel' : 'image');

      for (const card of snapshot.cards) {
        if (card.video_hd_url) mediaUrls.push(card.video_hd_url);
        else if (card.video_sd_url) mediaUrls.push(card.video_sd_url);
        else if (card.original_image_url) mediaUrls.push(card.original_image_url);
        else if (card.resized_image_url) mediaUrls.push(card.resized_image_url);

        if (!thumbnailUrl) {
          thumbnailUrl = card.video_preview_image_url || card.resized_image_url;
        }
      }
    }
    // Check videos
    else if (snapshot?.videos && snapshot.videos.length > 0) {
      mediaType = 'video';
      for (const video of snapshot.videos) {
        if (video.video_hd_url) mediaUrls.push(video.video_hd_url);
        else if (video.video_sd_url) mediaUrls.push(video.video_sd_url);
        if (!thumbnailUrl && video.video_preview_image_url) {
          thumbnailUrl = video.video_preview_image_url;
        }
      }
    }
    // Check images
    else if (snapshot?.images && snapshot.images.length > 0) {
      mediaType = snapshot.images.length > 1 ? 'carousel' : 'image';
      for (const image of snapshot.images) {
        if (image.original_image_url) mediaUrls.push(image.original_image_url);
        else if (image.resized_image_url) mediaUrls.push(image.resized_image_url);
      }
      thumbnailUrl = snapshot.images[0]?.resized_image_url || snapshot.images[0]?.original_image_url;
    }

    // Calculate days running from timestamps
    let daysRunning: number | undefined;
    if (result.start_date) {
      const startDate = new Date(result.start_date * 1000);
      const endDate = result.end_date ? new Date(result.end_date * 1000) : new Date();
      daysRunning = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Get body text from snapshot
    const bodyText = snapshot?.body?.text ||
      snapshot?.cards?.[0]?.body ||
      snapshot?.link_description ||
      null;

    ads.push({
      id: nanoid(),
      platform: 'meta',
      advertiserId: result.page_id,
      externalId: result.ad_archive_id,
      headline: snapshot?.title || snapshot?.cards?.[0]?.title || null,
      bodyText,
      ctaText: snapshot?.cta_text || snapshot?.cards?.[0]?.cta_text || null,
      landingUrl: snapshot?.link_url || snapshot?.cards?.[0]?.link_url || null,
      mediaType,
      mediaUrls: JSON.stringify(mediaUrls),
      thumbnailUrl: thumbnailUrl || snapshot?.page_profile_picture_url || null,
      impressionsMin: result.reach_estimate?.lower_bound || null,
      impressionsMax: result.reach_estimate?.upper_bound || null,
      likes: null,
      comments: null,
      shares: null,
      daysRunning: daysRunning || null,
      countryTargeting: result.targeted_or_reached_countries
        ? JSON.stringify(result.targeted_or_reached_countries)
        : null,
      firstSeenAt: result.start_date_formatted || null,
      lastSeenAt: result.end_date_formatted || null,
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
