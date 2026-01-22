import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAnalyzer } from '@/lib/analysis/gemini';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    if (ad.analysis) {
      return NextResponse.json({
        message: 'Ad already analyzed',
        analysis: JSON.parse(ad.analysis),
      });
    }

    // Run analysis
    const analyzer = getAnalyzer();
    const analysis = await analyzer.analyzeAd(ad);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Failed to analyze ad - no media URLs' },
        { status: 400 }
      );
    }

    // Save analysis
    await db
      .update(ads)
      .set({ analysis: JSON.stringify(analysis) })
      .where(eq(ads.id, id));

    return NextResponse.json({
      message: 'Analysis complete',
      analysis,
    });
  } catch (error) {
    console.error('Analyze ad error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze ad' },
      { status: 500 }
    );
  }
}
