import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { generationJobs, generationQueue } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/webhooks/higgsfield
 * Receives completion notifications from Higgsfield API
 *
 * Expected payload:
 * {
 *   request_id: string,
 *   status: 'completed' | 'failed' | 'nsfw',
 *   video_url?: string,
 *   error?: string,
 *   completed_at?: string,
 *   model?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const {
      request_id,
      status,
      video_url,
      error,
      completed_at,
      model,
    } = body;

    if (!request_id) {
      return NextResponse.json(
        { error: 'request_id is required' },
        { status: 400 }
      );
    }

    console.log(`[Higgsfield Webhook] Request ${request_id}: ${status}`);

    // Find the job by Higgsfield request ID
    const jobs = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.higgsfieldRequestId, request_id))
      .limit(1);

    if (jobs.length === 0) {
      // Try to find by job ID (in case request_id is actually our job ID)
      const jobsById = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.id, request_id))
        .limit(1);

      if (jobsById.length === 0) {
        console.warn(`[Higgsfield Webhook] Job not found for request: ${request_id}`);
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      jobs.push(jobsById[0]);
    }

    const job = jobs[0];
    const now = new Date().toISOString();

    // Map Higgsfield status to our status
    let newStatus = job.status;
    let errorMessage = error || null;

    if (status === 'completed') {
      newStatus = 'review'; // Move to review queue
    } else if (status === 'failed') {
      newStatus = 'failed';
    } else if (status === 'nsfw') {
      newStatus = 'failed';
      errorMessage = 'Content flagged as NSFW by Higgsfield safety filters';
    }

    // Update the job
    await db
      .update(generationJobs)
      .set({
        status: newStatus,
        outputVideoUrl: video_url || job.outputVideoUrl,
        errorMessage,
        generatedAt: completed_at || now,
        updatedAt: now,
        model: model || job.model,
      })
      .where(eq(generationJobs.id, job.id));

    // Remove from queue if completed or failed
    if (newStatus === 'review' || newStatus === 'failed') {
      await db
        .delete(generationQueue)
        .where(eq(generationQueue.jobId, job.id));
    }

    console.log(`[Higgsfield Webhook] Updated job ${job.id} to status: ${newStatus}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: newStatus,
    });
  } catch (error) {
    console.error('[Higgsfield Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/higgsfield
 * Health check / verification endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Higgsfield Webhook Handler',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
