import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { scrapeJobs, ads, advertisers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apifyClient } from '@/lib/apify/client';
import { getMetaScrapeResults, MetaFilterOptions } from '@/lib/apify/meta-scraper';
import { getTikTokScrapeResults, TikTokFilterOptions } from '@/lib/apify/tiktok-scraper';
import { getInstagramScrapeResults, InstagramFilterOptions } from '@/lib/apify/instagram-scraper';

export const maxDuration = 300; // 5 minutes for Vercel Pro

/**
 * POST /api/jobs/[id]/retry
 *
 * Retry processing results for a failed job.
 * This is useful when Apify completed but result processing failed.
 * The Apify data is typically available for 7 days after the run.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id: jobId } = await params;

    // Get the job
    const jobs = await db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.id, jobId))
      .limit(1);

    if (jobs.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];

    // Check if job has an Apify run ID
    if (!job.apifyRunId) {
      return NextResponse.json(
        { error: 'Job has no Apify run ID - cannot retry' },
        { status: 400 }
      );
    }

    // Check Apify run status
    let runStatus;
    try {
      const { data } = await apifyClient.getRunStatus(job.apifyRunId);
      runStatus = data;
    } catch (err) {
      return NextResponse.json(
        { error: 'Cannot reach Apify - run may have been deleted (data expires after 7 days)' },
        { status: 400 }
      );
    }

    if (runStatus.status !== 'SUCCEEDED') {
      return NextResponse.json(
        { error: `Apify run status is ${runStatus.status} - cannot retry` },
        { status: 400 }
      );
    }

    // Update job status to running
    await db
      .update(scrapeJobs)
      .set({
        status: 'running',
        error: null,
        completedAt: null,
      })
      .where(eq(scrapeJobs.id, jobId));

    // Process results synchronously (not background) for retry
    try {
      let result;
      const platform = job.platform;

      // Use empty filters for retry - we just want all the data
      if (platform === 'meta') {
        const metaFilters: MetaFilterOptions = {};
        result = await getMetaScrapeResults(job.apifyRunId, metaFilters);
      } else if (platform === 'tiktok') {
        const tiktokFilters: TikTokFilterOptions = {};
        result = await getTikTokScrapeResults(job.apifyRunId, tiktokFilters);
      } else if (platform === 'instagram') {
        const igFilters: InstagramFilterOptions = {};
        result = await getInstagramScrapeResults(job.apifyRunId, igFilters);
      } else {
        throw new Error(`Unknown platform: ${platform}`);
      }

      if (result.status !== 'completed') {
        throw new Error(`Scrape status: ${result.status}`);
      }

      // Track processing stats
      let advertisersProcessed = 0;
      let advertisersSkipped = 0;
      let adsInserted = 0;
      let adsSkipped = 0;
      const errors: string[] = [];

      // Insert advertisers
      for (const advertiser of result.advertisers) {
        if (!advertiser.id || advertiser.id === '') {
          advertisersSkipped++;
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
            // Update with new data
            await db
              .update(advertisers)
              .set({ lastScrapedAt: new Date().toISOString() })
              .where(eq(advertisers.id, advertiser.id));
          }
          advertisersProcessed++;
        } catch (err) {
          advertisersSkipped++;
          errors.push(`Advertiser ${advertiser.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Insert ads
      for (const ad of result.ads) {
        try {
          if (ad.externalId) {
            const existing = await db
              .select()
              .from(ads)
              .where(eq(ads.externalId, ad.externalId))
              .limit(1);

            if (existing.length > 0) {
              adsSkipped++;
              continue;
            }
          }

          await db.insert(ads).values(ad);
          adsInserted++;
        } catch (err) {
          adsSkipped++;
          errors.push(`Ad ${ad.externalId || 'unknown'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Update job status
      await db
        .update(scrapeJobs)
        .set({
          status: 'completed',
          adsFound: adsInserted,
          completedAt: new Date().toISOString(),
          error: errors.length > 0 ? `Partial success: ${errors.length} errors` : null,
        })
        .where(eq(scrapeJobs.id, jobId));

      return NextResponse.json({
        success: true,
        jobId,
        stats: {
          advertisersProcessed,
          advertisersSkipped,
          adsInserted,
          adsSkipped,
          errorCount: errors.length,
        },
        errors: errors.slice(0, 10), // Return first 10 errors
      });
    } catch (processErr) {
      const errorMsg = processErr instanceof Error ? processErr.message : 'Unknown processing error';

      await db
        .update(scrapeJobs)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: `Retry failed: ${errorMsg}`,
        })
        .where(eq(scrapeJobs.id, jobId));

      return NextResponse.json(
        { error: `Processing failed: ${errorMsg}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Retry error:', error);
    return NextResponse.json(
      { error: 'Failed to retry job' },
      { status: 500 }
    );
  }
}
