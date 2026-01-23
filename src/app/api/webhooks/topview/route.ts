import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { generationJobs, generationQueue } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/webhooks/topview
 * Receives completion notifications from TopView API
 *
 * Expected payload:
 * {
 *   task_id: string,
 *   status: 'completed' | 'failed',
 *   video_url?: string,
 *   preview_url?: string,
 *   error?: string,
 *   completed_at?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const {
      task_id,
      status,
      video_url,
      preview_url,
      error,
      completed_at,
    } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      );
    }

    console.log(`[TopView Webhook] Task ${task_id}: ${status}`);

    // Find the job by TopView task ID
    const jobs = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.topviewTaskId, task_id))
      .limit(1);

    if (jobs.length === 0) {
      // Try to find by job ID (in case task_id is actually our job ID)
      const jobsById = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.id, task_id))
        .limit(1);

      if (jobsById.length === 0) {
        console.warn(`[TopView Webhook] Job not found for task: ${task_id}`);
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      jobs.push(jobsById[0]);
    }

    const job = jobs[0];
    const now = new Date().toISOString();

    // Map TopView status to our status
    let newStatus = job.status;
    if (status === 'completed') {
      newStatus = 'review'; // Move to review queue
    } else if (status === 'failed') {
      newStatus = 'failed';
    }

    // Update the job
    await db
      .update(generationJobs)
      .set({
        status: newStatus,
        outputVideoUrl: video_url || job.outputVideoUrl,
        previewUrl: preview_url || job.previewUrl,
        errorMessage: error || null,
        generatedAt: completed_at || now,
        updatedAt: now,
      })
      .where(eq(generationJobs.id, job.id));

    // Remove from queue if completed or failed
    if (newStatus === 'review' || newStatus === 'failed') {
      await db
        .delete(generationQueue)
        .where(eq(generationQueue.jobId, job.id));
    }

    console.log(`[TopView Webhook] Updated job ${job.id} to status: ${newStatus}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: newStatus,
    });
  } catch (error) {
    console.error('[TopView Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/topview
 * Health check / verification endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'TopView Webhook Handler',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
