import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { scrapeJobs, ads, advertisers } from '@/lib/db/schema';
import { startMetaScrape, getMetaScrapeResults } from '@/lib/apify/meta-scraper';
import { startTikTokScrape, getTikTokScrapeResults } from '@/lib/apify/tiktok-scraper';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, searchType, query, filters } = body;

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
      runId = await startTikTokScrape({
        keyword: query,
        region: filters?.country || 'US',
        period: filters?.period || '30',
        orderBy: filters?.orderBy || 'popular',
        adFormat: filters?.adFormat || 'ALL',
        maxItems: filters?.maxItems || 100,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid platform. Use "meta" or "tiktok"' },
        { status: 400 }
      );
    }

    // Update job with run ID
    await db
      .update(scrapeJobs)
      .set({ status: 'running', apifyRunId: runId })
      .where(eq(scrapeJobs.id, jobId));

    // Start background processing
    processResults(jobId, platform, runId).catch(console.error);

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

async function processResults(jobId: string, platform: string, runId: string) {
  try {
    let result;

    if (platform === 'meta') {
      result = await getMetaScrapeResults(runId);
    } else {
      result = await getTikTokScrapeResults(runId);
    }

    if (result.status !== 'completed') {
      await db
        .update(scrapeJobs)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: `Scrape ${result.status}`,
        })
        .where(eq(scrapeJobs.id, jobId));
      return;
    }

    // Insert advertisers (upsert)
    for (const advertiser of result.advertisers) {
      const existing = await db
        .select()
        .from(advertisers)
        .where(eq(advertisers.id, advertiser.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(advertisers).values(advertiser);
      } else {
        await db
          .update(advertisers)
          .set({ lastScrapedAt: new Date().toISOString() })
          .where(eq(advertisers.id, advertiser.id));
      }
    }

    // Insert ads (check for duplicates by external ID)
    let insertedCount = 0;
    for (const ad of result.ads) {
      const existing = await db
        .select()
        .from(ads)
        .where(eq(ads.externalId, ad.externalId || ''))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(ads).values(ad);
        insertedCount++;
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
    await db
      .update(scrapeJobs)
      .set({
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(scrapeJobs.id, jobId));
  }
}
