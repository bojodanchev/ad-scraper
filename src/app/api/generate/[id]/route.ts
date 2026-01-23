import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { generationJobs, generationQueue, ads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/generate/[id]
 * Get a specific generation job with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const { id } = await params;

    const results = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = results[0];

    // Get source ad details if linked
    let sourceAd = null;
    if (job.sourceAdId) {
      const adResults = await db
        .select()
        .from(ads)
        .where(eq(ads.id, job.sourceAdId))
        .limit(1);

      if (adResults.length > 0) {
        sourceAd = {
          id: adResults[0].id,
          headline: adResults[0].headline,
          bodyText: adResults[0].bodyText,
          thumbnailUrl: adResults[0].thumbnailUrl,
          mediaUrls: adResults[0].mediaUrls ? JSON.parse(adResults[0].mediaUrls) : [],
        };
      }
    }

    // Get queue info
    const queueResults = await db
      .select()
      .from(generationQueue)
      .where(eq(generationQueue.jobId, id))
      .limit(1);

    return NextResponse.json({
      ...job,
      inputData: job.inputData ? JSON.parse(job.inputData) : null,
      sourceAd,
      queue: queueResults[0] || null,
    });
  } catch (error) {
    console.error('Get generation job error:', error);
    return NextResponse.json({ error: 'Failed to get job' }, { status: 500 });
  }
}

/**
 * PATCH /api/generate/[id]
 * Update a generation job (status, review, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      reviewNotes,
      outputVideoUrl,
      previewUrl,
      errorMessage,
      creditsUsed,
    } = body;

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      updatedAt: now,
    };

    if (status !== undefined) {
      updates.status = status;

      // Set timestamps based on status
      if (status === 'completed' || status === 'failed') {
        updates.generatedAt = now;
      }
      if (status === 'approved' || status === 'rejected') {
        updates.reviewedAt = now;
      }
    }

    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;
    if (outputVideoUrl !== undefined) updates.outputVideoUrl = outputVideoUrl;
    if (previewUrl !== undefined) updates.previewUrl = previewUrl;
    if (errorMessage !== undefined) updates.errorMessage = errorMessage;
    if (creditsUsed !== undefined) updates.creditsUsed = creditsUsed;

    await db
      .update(generationJobs)
      .set(updates)
      .where(eq(generationJobs.id, id));

    // Fetch updated job
    const results = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...results[0],
      inputData: results[0].inputData ? JSON.parse(results[0].inputData) : null,
    });
  } catch (error) {
    console.error('Update generation job error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

/**
 * DELETE /api/generate/[id]
 * Delete a generation job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const { id } = await params;

    // Delete queue entry first (foreign key constraint)
    await db
      .delete(generationQueue)
      .where(eq(generationQueue.jobId, id));

    // Delete the job
    await db
      .delete(generationJobs)
      .where(eq(generationJobs.id, id));

    return NextResponse.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    console.error('Delete generation job error:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
