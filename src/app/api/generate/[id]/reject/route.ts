import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { generationJobs, generationQueue } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/generate/[id]/reject
 * Reject a generated video, optionally queue for regeneration
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { notes, regenerate = false } = body;
    const now = new Date().toISOString();

    // Check job exists
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
        { error: `Cannot reject job in ${job.status} status. Must be in review or completed status.` },
        { status: 400 }
      );
    }

    // Update to rejected
    await db
      .update(generationJobs)
      .set({
        status: 'rejected',
        reviewedAt: now,
        reviewNotes: notes || job.reviewNotes,
        updatedAt: now,
      })
      .where(eq(generationJobs.id, id));

    let newJobId = null;

    // Optionally create a new job for regeneration
    if (regenerate) {
      newJobId = nanoid();
      const queueId = nanoid();
      const retryCount = (job.retryCount || 0) + 1;

      // Create new job based on the original
      await db.insert(generationJobs).values({
        id: newJobId,
        sourceAdId: job.sourceAdId,
        platform: job.platform,
        model: job.model,
        status: 'pending',
        inputType: job.inputType,
        inputData: job.inputData,
        retryCount,
        createdAt: now,
        updatedAt: now,
      });

      // Add to queue with higher priority
      await db.insert(generationQueue).values({
        id: queueId,
        jobId: newJobId,
        platform: job.platform,
        priority: 1, // Higher priority for regeneration
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: regenerate ? 'Video rejected and queued for regeneration' : 'Video rejected',
      newJobId,
    });
  } catch (error) {
    console.error('Reject job error:', error);
    return NextResponse.json({ error: 'Failed to reject job' }, { status: 500 });
  }
}
