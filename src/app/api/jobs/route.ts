import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { scrapeJobs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all jobs, ordered by most recent first
    const jobs = await db
      .select({
        id: scrapeJobs.id,
        platform: scrapeJobs.platform,
        searchType: scrapeJobs.searchType,
        query: scrapeJobs.query,
        status: scrapeJobs.status,
        adsFound: scrapeJobs.adsFound,
        apifyRunId: scrapeJobs.apifyRunId,
        startedAt: scrapeJobs.startedAt,
        completedAt: scrapeJobs.completedAt,
        error: scrapeJobs.error,
      })
      .from(scrapeJobs)
      .orderBy(desc(scrapeJobs.startedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json({ error: 'Failed to get jobs' }, { status: 500 });
  }
}
