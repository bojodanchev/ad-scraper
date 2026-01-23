import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { generationJobs, generationQueue, ads } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * GET /api/generate
 * List generation jobs with filtering
 */
export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions = [];

    if (status) {
      conditions.push(eq(generationJobs.status, status));
    }

    if (platform) {
      conditions.push(eq(generationJobs.platform, platform));
    }

    const results = await db
      .select({
        id: generationJobs.id,
        sourceAdId: generationJobs.sourceAdId,
        platform: generationJobs.platform,
        model: generationJobs.model,
        status: generationJobs.status,
        inputType: generationJobs.inputType,
        inputData: generationJobs.inputData,
        outputVideoUrl: generationJobs.outputVideoUrl,
        previewUrl: generationJobs.previewUrl,
        generatedAt: generationJobs.generatedAt,
        reviewedAt: generationJobs.reviewedAt,
        reviewNotes: generationJobs.reviewNotes,
        errorMessage: generationJobs.errorMessage,
        creditsUsed: generationJobs.creditsUsed,
        createdAt: generationJobs.createdAt,
      })
      .from(generationJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(generationJobs.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(generationJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      jobs: results.map(job => ({
        ...job,
        inputData: job.inputData ? JSON.parse(job.inputData) : null,
      })),
      total: countResult[0]?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get generation jobs error:', error);
    return NextResponse.json({ error: 'Failed to get generation jobs' }, { status: 500 });
  }
}

/**
 * POST /api/generate
 * Queue a new generation job
 */
export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const {
      sourceAdId,
      platform,
      model,
      inputType,
      productUrl,
      imageUrl,
      avatarId,
      script,
      prompt,
      offer,
      aspectRatio = '9:16',
      duration,
      priority = 0,
    } = body;

    // Validate required fields
    if (!inputType) {
      return NextResponse.json(
        { error: 'inputType is required' },
        { status: 400 }
      );
    }

    // Auto-select platform if not specified
    let selectedPlatform = platform;
    if (!selectedPlatform) {
      if (productUrl) {
        selectedPlatform = 'topview';
      } else if (inputType === 'text-to-video') {
        selectedPlatform = 'higgsfield';
      } else if (imageUrl) {
        selectedPlatform = 'higgsfield';
      } else if (avatarId) {
        selectedPlatform = 'topview';
      } else {
        selectedPlatform = 'higgsfield';
      }
    }

    const jobId = nanoid();
    const queueId = nanoid();
    const now = new Date().toISOString();

    // Prepare input data
    const inputData = JSON.stringify({
      productUrl,
      imageUrl,
      avatarId,
      script,
      prompt,
      offer,
      aspectRatio,
      duration,
    });

    // Create the job
    await db.insert(generationJobs).values({
      id: jobId,
      sourceAdId,
      platform: selectedPlatform,
      model,
      status: 'pending',
      inputType,
      inputData,
      createdAt: now,
      updatedAt: now,
    });

    // Add to queue
    await db.insert(generationQueue).values({
      id: queueId,
      jobId,
      platform: selectedPlatform,
      priority,
      createdAt: now,
    });

    return NextResponse.json({
      id: jobId,
      queueId,
      platform: selectedPlatform,
      status: 'pending',
      message: 'Job queued for generation',
    });
  } catch (error) {
    console.error('Create generation job error:', error);
    return NextResponse.json({ error: 'Failed to create generation job' }, { status: 500 });
  }
}
