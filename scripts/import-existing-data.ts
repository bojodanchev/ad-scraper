/**
 * Script to import existing Apify scrape data into the database
 * Run with: npx tsx scripts/import-existing-data.ts
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const APIFY_TOKEN = envVars.APIFY_TOKEN;
const TURSO_DATABASE_URL = envVars.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = envVars.TURSO_AUTH_TOKEN;

if (!APIFY_TOKEN || !TURSO_DATABASE_URL) {
  console.error('Missing required env vars: APIFY_TOKEN, TURSO_DATABASE_URL');
  process.exit(1);
}

// Create DB client
const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

// Meta Ads result interface (from the API)
interface MetaAdResult {
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  start_date: number;
  end_date: number;
  start_date_formatted?: string;
  end_date_formatted?: string;
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
    cards?: Array<{
      body?: string;
      title?: string;
      link_url?: string;
      cta_text?: string;
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
  reach_estimate?: {
    lower_bound?: number;
    upper_bound?: number;
  };
  targeted_or_reached_countries?: string[];
}

// Dataset IDs from successful Meta scraper runs
const META_DATASETS = [
  { id: 'CcIFquvhl2MsPXe6W', query: 'shopify' },  // 10 items
  { id: 'LqSYP31WDlNJxdqr4', query: 'fitness' },  // fitness search
];

async function fetchDataset(datasetId: string): Promise<MetaAdResult[]> {
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset ${datasetId}: ${response.statusText}`);
  }
  return response.json();
}

function processMetaResult(result: MetaAdResult): {
  advertiser: schema.NewAdvertiser;
  ad: schema.NewAd;
} | null {
  if (!result.page_id) {
    console.warn('Skipping result with no page_id');
    return null;
  }

  const snapshot = result.snapshot;

  // Determine media type and URLs
  let mediaType: 'image' | 'video' | 'carousel' = 'image';
  const mediaUrls: string[] = [];
  let thumbnailUrl: string | undefined;

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
  } else if (snapshot?.videos && snapshot.videos.length > 0) {
    mediaType = 'video';
    for (const video of snapshot.videos) {
      if (video.video_hd_url) mediaUrls.push(video.video_hd_url);
      else if (video.video_sd_url) mediaUrls.push(video.video_sd_url);
      if (!thumbnailUrl && video.video_preview_image_url) {
        thumbnailUrl = video.video_preview_image_url;
      }
    }
  } else if (snapshot?.images && snapshot.images.length > 0) {
    mediaType = snapshot.images.length > 1 ? 'carousel' : 'image';
    for (const image of snapshot.images) {
      if (image.original_image_url) mediaUrls.push(image.original_image_url);
      else if (image.resized_image_url) mediaUrls.push(image.resized_image_url);
    }
    thumbnailUrl = snapshot.images[0]?.resized_image_url || snapshot.images[0]?.original_image_url;
  }

  // Calculate days running
  let daysRunning: number | undefined;
  if (result.start_date) {
    const startDate = new Date(result.start_date * 1000);
    const endDate = result.end_date ? new Date(result.end_date * 1000) : new Date();
    daysRunning = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const bodyText = snapshot?.body?.text || snapshot?.cards?.[0]?.body || snapshot?.link_description || null;

  return {
    advertiser: {
      id: result.page_id,
      platform: 'meta',
      name: result.page_name || snapshot?.page_name || 'Unknown',
      pageUrl: snapshot?.page_profile_uri || `https://facebook.com/${result.page_id}`,
      firstSeenAt: new Date().toISOString(),
      lastScrapedAt: new Date().toISOString(),
      isTracked: false,
    },
    ad: {
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
    },
  };
}

async function main() {
  console.log('Starting import of existing Apify data...\n');

  let totalAds = 0;
  let totalAdvertisers = 0;
  let skipped = 0;

  for (const dataset of META_DATASETS) {
    console.log(`\nFetching dataset ${dataset.id} (${dataset.query})...`);

    try {
      const results = await fetchDataset(dataset.id);
      console.log(`  Found ${results.length} results`);

      const advertisersToInsert = new Map<string, schema.NewAdvertiser>();
      const adsToInsert: schema.NewAd[] = [];

      for (const result of results) {
        const processed = processMetaResult(result);
        if (!processed) {
          skipped++;
          continue;
        }

        // Check if ad already exists
        const existing = await db
          .select()
          .from(schema.ads)
          .where(eq(schema.ads.externalId, processed.ad.externalId!))
          .limit(1);

        if (existing.length > 0) {
          console.log(`  Skipping duplicate ad: ${processed.ad.externalId}`);
          skipped++;
          continue;
        }

        advertisersToInsert.set(processed.advertiser.id, processed.advertiser);
        adsToInsert.push(processed.ad);
      }

      // Insert advertisers
      for (const advertiser of advertisersToInsert.values()) {
        const existing = await db
          .select()
          .from(schema.advertisers)
          .where(eq(schema.advertisers.id, advertiser.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.advertisers).values(advertiser);
          totalAdvertisers++;
          console.log(`  Added advertiser: ${advertiser.name}`);
        }
      }

      // Insert ads
      for (const ad of adsToInsert) {
        await db.insert(schema.ads).values(ad);
        totalAds++;
      }

      console.log(`  Imported ${adsToInsert.length} ads from ${dataset.query} dataset`);
    } catch (error) {
      console.error(`  Error processing dataset ${dataset.id}:`, error);
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`Total ads imported: ${totalAds}`);
  console.log(`Total advertisers added: ${totalAdvertisers}`);
  console.log(`Skipped (duplicates/invalid): ${skipped}`);
}

main().catch(console.error);
