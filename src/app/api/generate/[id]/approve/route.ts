import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/generate/[id]/approve
 * Approve a generated video
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { notes } = body;
    const now = new Date().toISOString();

    // Check job exists and is in review status
    const existing = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = existing[0];

    if (job.status !== 'review' && job.status !== 'completed') {
      return NextResponse.json(
        { error: `Cannot approve job in ${job.status} status. Must be in review or completed status.` },
        { status: 400 }
      );
    }

    // Update to approved
    await db
      .update(generationJobs)
      .set({
        status: 'approved',
        reviewedAt: now,
        reviewNotes: notes || job.reviewNotes,
        updatedAt: now,
      })
      .where(eq(generationJobs.id, id));

    // Fetch updated job
    const results = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Video approved',
      job: {
        ...results[0],
        inputData: results[0].inputData ? JSON.parse(results[0].inputData) : null,
      },
    });
  } catch (error) {
    console.error('Approve job error:', error);
    return NextResponse.json({ error: 'Failed to approve job' }, { status: 500 });
  }
}
