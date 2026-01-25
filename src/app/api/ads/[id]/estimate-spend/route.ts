import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { ads, spendEstimates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSpendEstimator } from '@/lib/intelligence';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { niche } = body;

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

    // Run estimation
    const estimator = getSpendEstimator();
    const result = estimator.estimateSpend(ad, niche);

    // Save or update estimate
    const existingEstimate = await db
      .select()
      .from(spendEstimates)
      .where(eq(spendEstimates.adId, id))
      .limit(1);

    const dbRecord = estimator.toDbRecord(id, result);

    if (existingEstimate.length > 0) {
      await db
        .update(spendEstimates)
        .set({
          ...dbRecord,
          id: existingEstimate[0].id, // Keep existing ID
        })
        .where(eq(spendEstimates.id, existingEstimate[0].id));
    } else {
      await db.insert(spendEstimates).values(dbRecord);
    }

    return NextResponse.json({
      message: 'Spend estimation complete',
      estimate: result,
    });
  } catch (error) {
    console.error('Estimate spend error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate spend' },
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

    const existingEstimate = await db
      .select()
      .from(spendEstimates)
      .where(eq(spendEstimates.adId, id))
      .limit(1);

    if (existingEstimate.length === 0) {
      // Generate on-the-fly
      const adResults = await db
        .select()
        .from(ads)
        .where(eq(ads.id, id))
        .limit(1);

      if (adResults.length === 0) {
        return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
      }

      const estimator = getSpendEstimator();
      const result = estimator.estimateSpend(adResults[0]);

      return NextResponse.json({
        estimate: result,
        cached: false,
      });
    }

    const estimate = existingEstimate[0];

    return NextResponse.json({
      estimate: {
        daysRunning: estimate.daysRunning,
        firstSeen: estimate.firstSeen,
        lastSeen: estimate.lastSeen,
        dailySpend: {
          min: parseFloat(estimate.estimatedDailySpendMin || '0'),
          max: parseFloat(estimate.estimatedDailySpendMax || '0'),
        },
        totalSpend: {
          min: parseFloat(estimate.estimatedTotalSpendMin || '0'),
          max: parseFloat(estimate.estimatedTotalSpendMax || '0'),
        },
        isScaling: estimate.isScaling,
        scalingSignals: JSON.parse(estimate.scalingSignals || '[]'),
        niche: estimate.niche,
        cpmUsed: JSON.parse(estimate.cpmBenchmarkUsed || '{}'),
        confidence: estimate.confidence,
      },
      cached: true,
    });
  } catch (error) {
    console.error('Get spend estimate error:', error);
    return NextResponse.json(
      { error: 'Failed to get spend estimate' },
      { status: 500 }
    );
  }
}
