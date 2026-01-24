import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db, ensureInitialized } from '@/lib/db/client';
import { scrapeJobs, ads, advertisers } from '@/lib/db/schema';
import { startMetaScrape, getMetaScrapeResults, MetaFilterOptions } from '@/lib/apify/meta-scraper';
import { startTikTokScrape, getTikTokScrapeResults, TikTokFilterOptions } from '@/lib/apify/tiktok-scraper';
import { startInstagramScrape, getInstagramScrapeResults, InstagramFilterOptions } from '@/lib/apify/instagram-scraper';
import { eq } from 'drizzle-orm';

export const maxDuration = 300; // 5 minutes for Vercel Pro

// Simple retry helper for transient database failures
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        console.warn(`DB operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }
  throw lastError;
}

// Combined filter options for all platforms
interface ScrapeFilters {
  timePeriodDays?: number;
  // TikTok filters
  minFollowers?: number;
  maxFollowers?: number;
  // Instagram filters
  minEngagementRate?: number;
  minLikes?: number;
  minViews?: number;
  // Meta filters
  minImpressions?: number;
  maxImpressions?: number;
}

// Convert time period string to days
function timePeriodToDays(timePeriod?: string): number | undefined {
  if (!timePeriod) return undefined;
  const mapping: Record<string, number> = {
    '48h': 2,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  return mapping[timePeriod];
}

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const { platform, searchType, query, filters } = body;

    // Build filter options
    const scrapeFilters: ScrapeFilters = {
      timePeriodDays: timePeriodToDays(filters?.timePeriod),
      // TikTok filters
      minFollowers: filters?.minFollowers ? parseInt(filters.minFollowers) : undefined,
      maxFollowers: filters?.maxFollowers ? parseInt(filters.maxFollowers) : undefined,
      // Instagram filters
      minEngagementRate: filters?.minEngagementRate ? parseFloat(filters.minEngagementRate) : undefined,
      minLikes: filters?.minLikes ? parseInt(filters.minLikes) : undefined,
      minViews: filters?.minViews ? parseInt(filters.minViews) : undefined,
      // Meta filters
      minImpressions: filters?.minImpressions ? parseInt(filters.minImpressions) : undefined,
      maxImpressions: filters?.maxImpressions ? parseInt(filters.maxImpressions) : undefined,
    };

    if (!platform || !query) {
      return NextResponse.json(
        { error: 'Platform and query are required' },
        { status: 400 }
      );
    }

    // Create job record
    const jobId = nanoid();
    const now = new Date().toISOString();

    await db.insert(scrapeJobs).values({
      id: jobId,
      platform,
      searchType: searchType || 'keyword',
      query,
      status: 'pending',
      adsFound: 0,
      startedAt: now,
    });

    // Start the appropriate scraper
    let runId: string;

    try {
      if (platform === 'meta') {
        runId = await startMetaScrape({
          searchTerm: searchType === 'keyword' ? query : undefined,
          pageIds: searchType === 'advertiser' ? [query] : undefined,
          country: filters?.country || 'US',
          mediaType: filters?.mediaType || 'ALL',
          activeStatus: filters?.activeOnly ? 'ACTIVE' : 'ALL',
          maxItems: filters?.maxItems || 100,
        });
      } else if (platform === 'tiktok') {
        // TikTok: supports hashtags, profiles, or search queries
        // Search queries are great for niche targeting (e.g., "AI automation", "ecommerce")
        runId = await startTikTokScrape({
          hashtags: searchType === 'hashtag' ? [query] : undefined,
          profiles: searchType === 'profile' ? [query] : undefined,
          searchQueries: searchType === 'keyword' ? [query] : undefined,
          sortBy: filters?.sortBy || 'popular',
          maxItems: filters?.maxItems || 50,
          timePeriodDays: scrapeFilters.timePeriodDays, // Native date filtering at scrape time
          minFollowers: scrapeFilters.minFollowers,
          maxFollowers: scrapeFilters.maxFollowers,
        });
      } else if (platform === 'instagram') {
        // Instagram: supports hashtags, profiles, or search
        runId = await startInstagramScrape({
          search: searchType === 'keyword' ? query : undefined,
          searchType: searchType === 'keyword' ? 'hashtag' : undefined,
          hashtags: searchType === 'hashtag' ? [query] : undefined,
          usernames: searchType === 'profile' ? [query] : undefined,
          resultsLimit: filters?.maxItems || 50,
          timePeriodDays: scrapeFilters.timePeriodDays, // For post-scrape filtering
          minEngagementRate: scrapeFilters.minEngagementRate,
          minLikes: scrapeFilters.minLikes,
          minViews: scrapeFilters.minViews,
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid platform. Use "meta", "tiktok", or "instagram"' },
          { status: 400 }
        );
      }
    } catch (err) {
      await db
        .update(scrapeJobs)
        .set({
          status: 'failed',
          error: err instanceof Error ? err.message : 'Failed to start scraper',
          completedAt: new Date().toISOString()
        })
        .where(eq(scrapeJobs.id, jobId));

      return NextResponse.json(
        { error: 'Failed to start scraper. Check your APIFY_TOKEN.' },
        { status: 500 }
      );
    }

    // Update job with run ID
    await db
      .update(scrapeJobs)
      .set({ status: 'running', apifyRunId: runId })
      .where(eq(scrapeJobs.id, jobId));

    // Start background processing (non-blocking)
    processResults(jobId, platform, runId, scrapeFilters).catch(console.error);

    return NextResponse.json({
      jobId,
      status: 'running',
      message: 'Scrape started. Poll /api/jobs/{jobId} for status.',
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to start scrape' },
      { status: 500 }
    );
  }
}

async function processResults(jobId: string, platform: string, runId: string, filters: ScrapeFilters) {
  // Track processing stats for better visibility
  const stats = {
    advertisersTotal: 0,
    advertisersProcessed: 0,
    advertisersSkipped: 0,
    adsTotal: 0,
    adsInserted: 0,
    adsSkipped: 0,
    adsDuplicate: 0,
    errors: [] as string[],
  };

  // Wrap everything in try-catch to ALWAYS update job status
  const markJobFailed = async (errorMsg: string) => {
    try {
      console.error(`Job ${jobId} failed:`, errorMsg);
      console.error('Stats at failure:', JSON.stringify(stats));
      // Use retry wrapper for critical status update
      await withRetry(() =>
        db
          .update(scrapeJobs)
          .set({
            status: 'failed',
            completedAt: new Date().toISOString(),
            error: errorMsg,
          })
          .where(eq(scrapeJobs.id, jobId))
      );
    } catch (dbErr) {
      console.error('CRITICAL: Failed to update job status after retries:', dbErr);
    }
  };

  try {
    console.log(`Processing results for job ${jobId}, platform: ${platform}, runId: ${runId}`);

    let result;

    if (platform === 'meta') {
      const metaFilters: MetaFilterOptions = {
        minImpressions: filters.minImpressions,
        maxImpressions: filters.maxImpressions,
      };
      result = await getMetaScrapeResults(runId, metaFilters);
    } else if (platform === 'tiktok') {
      const tiktokFilters: TikTokFilterOptions = {
        timePeriodDays: filters.timePeriodDays,
        minFollowers: filters.minFollowers,
        maxFollowers: filters.maxFollowers,
      };
      result = await getTikTokScrapeResults(runId, tiktokFilters);
    } else if (platform === 'instagram') {
      const igFilters: InstagramFilterOptions = {
        timePeriodDays: filters.timePeriodDays,
        minEngagementRate: filters.minEngagementRate,
        minLikes: filters.minLikes,
        minViews: filters.minViews,
      };
      result = await getInstagramScrapeResults(runId, igFilters);
    } else {
      await markJobFailed(`Unknown platform: ${platform}`);
      return;
    }

    console.log(`Job ${jobId}: Apify returned status=${result.status}, ads=${result.ads.length}, advertisers=${result.advertisers.length}`);

    if (result.status !== 'completed') {
      // Provide more helpful error messages
      let errorMsg = `Scrape ${result.status}`;
      if (result.status === 'timeout') {
        errorMsg = 'Apify run timed out - try again or increase maxItems. You can retry via POST /api/jobs/{id}/retry once Apify completes.';
      } else if (result.status === 'failed') {
        errorMsg = 'Apify run failed - check Apify console for details';
      }
      await markJobFailed(errorMsg);
      return;
    }

    stats.advertisersTotal = result.advertisers.length;
    stats.adsTotal = result.ads.length;

    // Insert advertisers (upsert) - skip invalid entries
    for (const advertiser of result.advertisers) {
      // Validate advertiser.id before DB lookup - must be non-empty string
      if (!advertiser.id || advertiser.id === '' || advertiser.id.trim() === '') {
        console.warn(`Job ${jobId}: Skipping advertiser with empty/null ID`);
        stats.advertisersSkipped++;
        continue;
      }

      try {
        const existing = await db
          .select()
          .from(advertisers)
          .where(eq(advertisers.id, advertiser.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(advertisers).values(advertiser);
        } else {
          // Update with new data, preserving existing values if new ones are null
          const updateData: Record<string, unknown> = {
            lastScrapedAt: new Date().toISOString(),
          };

          // Only update fields if the new value is not null/undefined
          if (advertiser.avatarUrl) updateData.avatarUrl = advertiser.avatarUrl;
          if (advertiser.bio) updateData.bio = advertiser.bio;
          if (advertiser.verified !== undefined) updateData.verified = advertiser.verified;
          if (advertiser.followerCount !== null && advertiser.followerCount !== undefined) {
            updateData.followerCount = advertiser.followerCount;
          }
          if (advertiser.followingCount !== null && advertiser.followingCount !== undefined) {
            updateData.followingCount = advertiser.followingCount;
          }
          if (advertiser.totalLikes !== null && advertiser.totalLikes !== undefined) {
            updateData.totalLikes = advertiser.totalLikes;
          }
          if (advertiser.postsCount !== null && advertiser.postsCount !== undefined) {
            updateData.postsCount = advertiser.postsCount;
          }
          if (advertiser.engagementRate) updateData.engagementRate = advertiser.engagementRate;

          await db
            .update(advertisers)
            .set(updateData)
            .where(eq(advertisers.id, advertiser.id));
        }
        stats.advertisersProcessed++;
      } catch (advErr) {
        const errMsg = advErr instanceof Error ? advErr.message : 'Unknown error';
        console.error(`Job ${jobId}: Error processing advertiser ${advertiser.id}:`, errMsg);
        stats.advertisersSkipped++;
        stats.errors.push(`Advertiser ${advertiser.id}: ${errMsg}`);
      }
    }

    // Insert ads (check for duplicates by external ID)
    for (const ad of result.ads) {
      try {
        if (ad.externalId) {
          const existing = await db
            .select()
            .from(ads)
            .where(eq(ads.externalId, ad.externalId))
            .limit(1);

          if (existing.length > 0) {
            stats.adsDuplicate++;
            continue;
          }
        }

        await db.insert(ads).values(ad);
        stats.adsInserted++;
      } catch (adErr) {
        const errMsg = adErr instanceof Error ? adErr.message : 'Unknown error';
        console.error(`Job ${jobId}: Error inserting ad ${ad.externalId}:`, errMsg);
        stats.adsSkipped++;
        stats.errors.push(`Ad ${ad.externalId || 'unknown'}: ${errMsg}`);
      }
    }

    console.log(`Job ${jobId} completed:`, JSON.stringify(stats));

    // Build error message if there were partial failures
    let errorMsg: string | null = null;
    if (stats.errors.length > 0) {
      errorMsg = `Partial success: ${stats.adsInserted}/${stats.adsTotal} ads, ${stats.errors.length} errors`;
    }

    // Update job status with retry for reliability
    await withRetry(() =>
      db
        .update(scrapeJobs)
        .set({
          status: 'completed',
          adsFound: stats.adsInserted,
          completedAt: new Date().toISOString(),
          error: errorMsg,
        })
        .where(eq(scrapeJobs.id, jobId))
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Job ${jobId} process results error:`, error);
    await markJobFailed(`Processing error: ${errorMsg}`);
  }
}
