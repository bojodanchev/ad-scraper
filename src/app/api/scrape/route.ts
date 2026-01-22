import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db, ensureInitialized } from '@/lib/db/client';
import { scrapeJobs, ads, advertisers } from '@/lib/db/schema';
import { startMetaScrape, getMetaScrapeResults, MetaFilterOptions } from '@/lib/apify/meta-scraper';
import { startTikTokScrape, getTikTokScrapeResults, TikTokFilterOptions } from '@/lib/apify/tiktok-scraper';
import { startInstagramScrape, getInstagramScrapeResults, InstagramFilterOptions } from '@/lib/apify/instagram-scraper';
import { eq } from 'drizzle-orm';

export const maxDuration = 300; // 5 minutes for Vercel Pro

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
  // Wrap everything in try-catch to ALWAYS update job status
  const markJobFailed = async (errorMsg: string) => {
    try {
      await db
        .update(scrapeJobs)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: errorMsg,
        })
        .where(eq(scrapeJobs.id, jobId));
    } catch (dbErr) {
      console.error('Failed to update job status:', dbErr);
    }
  };

  try {
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

    if (result.status !== 'completed') {
      await markJobFailed(`Scrape ${result.status}`);
      return;
    }

    // Insert advertisers (upsert) - skip invalid entries
    for (const advertiser of result.advertisers) {
      // Validate advertiser.id before DB lookup
      if (!advertiser.id) {
        console.warn('Skipping advertiser with no ID');
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
      } catch (advErr) {
        console.error('Error processing advertiser:', advertiser.id, advErr);
        // Continue processing other advertisers
      }
    }

    // Insert ads (check for duplicates by external ID)
    let insertedCount = 0;
    for (const ad of result.ads) {
      try {
        if (ad.externalId) {
          const existing = await db
            .select()
            .from(ads)
            .where(eq(ads.externalId, ad.externalId))
            .limit(1);

          if (existing.length > 0) continue;
        }

        await db.insert(ads).values(ad);
        insertedCount++;
      } catch (adErr) {
        console.error('Error inserting ad:', ad.externalId, adErr);
        // Continue processing other ads
      }
    }

    // Update job status
    await db
      .update(scrapeJobs)
      .set({
        status: 'completed',
        adsFound: insertedCount,
        completedAt: new Date().toISOString(),
      })
      .where(eq(scrapeJobs.id, jobId));
  } catch (error) {
    console.error('Process results error:', error);
    await markJobFailed(error instanceof Error ? error.message : 'Unknown error');
  }
}
