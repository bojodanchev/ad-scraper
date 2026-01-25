import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { ads, adWinnerStatus } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getWinnerDetector } from '@/lib/intelligence';

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

    // Run evaluation
    const detector = getWinnerDetector();
    const result = detector.evaluateWinner(ad);

    // Save or update status
    const existingStatus = await db
      .select()
      .from(adWinnerStatus)
      .where(eq(adWinnerStatus.adId, id))
      .limit(1);

    const dbRecord = detector.toDbRecord(id, result);

    if (existingStatus.length > 0) {
      // Preserve original becameWinnerAt if already a winner
      const becameWinnerAt = existingStatus[0].isWinner
        ? existingStatus[0].becameWinnerAt
        : result.isWinner
          ? new Date().toISOString()
          : null;

      await db
        .update(adWinnerStatus)
        .set({
          ...dbRecord,
          id: existingStatus[0].id,
          becameWinnerAt,
        })
        .where(eq(adWinnerStatus.id, existingStatus[0].id));
    } else {
      await db.insert(adWinnerStatus).values(dbRecord);
    }

    return NextResponse.json({
      message: 'Winner evaluation complete',
      evaluation: result,
    });
  } catch (error) {
    console.error('Evaluate winner error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate winner' },
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

    const existingStatus = await db
      .select()
      .from(adWinnerStatus)
      .where(eq(adWinnerStatus.adId, id))
      .limit(1);

    if (existingStatus.length === 0) {
      // Generate on-the-fly
      const adResults = await db
        .select()
        .from(ads)
        .where(eq(ads.id, id))
        .limit(1);

      if (adResults.length === 0) {
        return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
      }

      const detector = getWinnerDetector();
      const result = detector.evaluateWinner(adResults[0]);

      return NextResponse.json({
        evaluation: result,
        cached: false,
      });
    }

    const status = existingStatus[0];

    return NextResponse.json({
      evaluation: {
        isWinner: status.isWinner,
        winnerScore: parseFloat(status.winnerScore || '0'),
        criteriaMet: JSON.parse(status.criteriaMet || '{}'),
        evaluatedAt: status.evaluatedAt,
        becameWinnerAt: status.becameWinnerAt,
      },
      cached: true,
    });
  } catch (error) {
    console.error('Get winner status error:', error);
    return NextResponse.json(
      { error: 'Failed to get winner status' },
      { status: 500 }
    );
  }
}
