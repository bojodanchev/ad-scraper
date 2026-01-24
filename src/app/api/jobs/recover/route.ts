import { NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { scrapeJobs } from '@/lib/db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { apifyClient } from '@/lib/apify/client';

// Recover stuck jobs that have been running for more than 10 minutes
const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function POST() {
  try {
    await ensureInitialized();

    const cutoffTime = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

    // Find all running jobs that started more than 10 minutes ago
    const stuckJobs = await db
      .select()
      .from(scrapeJobs)
      .where(
        and(
          eq(scrapeJobs.status, 'running'),
          sql`${scrapeJobs.startedAt} < ${cutoffTime}`
        )
      );

    const recovered: string[] = [];
    const stillRunning: string[] = [];

    for (const job of stuckJobs) {
      if (!job.apifyRunId) {
        // No Apify run ID - mark as failed
        await db
          .update(scrapeJobs)
          .set({
            status: 'failed',
            completedAt: new Date().toISOString(),
            error: 'No Apify run ID - job stuck at initialization',
          })
          .where(eq(scrapeJobs.id, job.id));
        recovered.push(job.id);
        continue;
      }

      try {
        // Check actual Apify status
        const { data: run } = await apifyClient.getRunStatus(job.apifyRunId);

        if (run.status === 'SUCCEEDED') {
          // Apify completed but we didn't process results
          // Mark as failed but provide retry instructions
          await db
            .update(scrapeJobs)
            .set({
              status: 'failed',
              completedAt: new Date().toISOString(),
              error: 'Apify completed but result processing failed. Retry via POST /api/jobs/' + job.id + '/retry (data available for 7 days)',
            })
            .where(eq(scrapeJobs.id, job.id));
          recovered.push(job.id);
        } else if (
          run.status === 'FAILED' ||
          run.status === 'ABORTED' ||
          run.status === 'TIMED-OUT'
        ) {
          // Apify failed
          await db
            .update(scrapeJobs)
            .set({
              status: 'failed',
              completedAt: new Date().toISOString(),
              error: `Apify run ${run.status.toLowerCase()}`,
            })
            .where(eq(scrapeJobs.id, job.id));
          recovered.push(job.id);
        } else {
          // Still actually running on Apify
          stillRunning.push(job.id);
        }
      } catch (apifyErr) {
        // Can't reach Apify - mark as failed
        await db
          .update(scrapeJobs)
          .set({
            status: 'failed',
            completedAt: new Date().toISOString(),
            error: 'Unable to check Apify status - run may have been deleted',
          })
          .where(eq(scrapeJobs.id, job.id));
        recovered.push(job.id);
      }
    }

    return NextResponse.json({
      message: `Checked ${stuckJobs.length} stuck jobs`,
      recovered: recovered.length,
      stillRunning: stillRunning.length,
      recoveredIds: recovered,
      stillRunningIds: stillRunning,
    });
  } catch (error) {
    console.error('Job recovery error:', error);
    return NextResponse.json(
      { error: 'Failed to recover jobs' },
      { status: 500 }
    );
  }
}
