import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { scrapeJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();
    
    const { id } = await params;

    const jobs = await db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.id, id))
      .limit(1);

    if (jobs.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];

    return NextResponse.json({
      id: job.id,
      platform: job.platform,
      searchType: job.searchType,
      query: job.query,
      status: job.status,
      adsFound: job.adsFound,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
    });
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
