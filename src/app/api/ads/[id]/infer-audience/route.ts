import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { ads, audienceInference } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAudienceInferenceEngine } from '@/lib/intelligence';

export const maxDuration = 120; // 2 minutes for video analysis

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;

    // Get the ad
    const adResults = await db
      .select()
      .from(ads)
      .where(eq(ads.id, id))
      .limit(1);

    if (adResults.length === 0) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    const ad = adResults[0];

    // Check if already analyzed
    const existingInference = await db
      .select()
      .from(audienceInference)
      .where(eq(audienceInference.adId, id))
      .limit(1);

    if (existingInference.length > 0) {
      return NextResponse.json({
        message: 'Audience already inferred',
        inference: {
          ...existingInference[0],
          inferredInterests: JSON.parse(existingInference[0].inferredInterests || '[]'),
          inferredPainPoints: JSON.parse(existingInference[0].inferredPainPoints || '[]'),
          inferredDesires: JSON.parse(existingInference[0].inferredDesires || '[]'),
          rawAnalysis: JSON.parse(existingInference[0].rawAnalysis || '{}'),
        },
      });
    }

    // Run inference
    const engine = getAudienceInferenceEngine();
    const result = await engine.inferFromAd(ad);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to infer audience - no media URLs' },
        { status: 400 }
      );
    }

    // Save inference
    const dbRecord = engine.toDbRecord(id, result);
    await db.insert(audienceInference).values(dbRecord);

    return NextResponse.json({
      message: 'Audience inference complete',
      inference: result,
    });
  } catch (error) {
    console.error('Infer audience error:', error);
    return NextResponse.json(
      { error: 'Failed to infer audience' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;

    const existingInference = await db
      .select()
      .from(audienceInference)
      .where(eq(audienceInference.adId, id))
      .limit(1);

    if (existingInference.length === 0) {
      return NextResponse.json({ error: 'No audience inference found' }, { status: 404 });
    }

    return NextResponse.json({
      inference: {
        ...existingInference[0],
        inferredInterests: JSON.parse(existingInference[0].inferredInterests || '[]'),
        inferredPainPoints: JSON.parse(existingInference[0].inferredPainPoints || '[]'),
        inferredDesires: JSON.parse(existingInference[0].inferredDesires || '[]'),
        rawAnalysis: JSON.parse(existingInference[0].rawAnalysis || '{}'),
      },
    });
  } catch (error) {
    console.error('Get audience inference error:', error);
    return NextResponse.json(
      { error: 'Failed to get audience inference' },
      { status: 500 }
    );
  }
}
