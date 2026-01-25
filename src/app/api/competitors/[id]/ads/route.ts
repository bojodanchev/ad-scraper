import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/db/client';
import { getCompetitorTracker, getWinnerDetector, getSpendEstimator } from '@/lib/intelligence';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true';

    const tracker = getCompetitorTracker();
    const competitorAds = await tracker.getCompetitorAds(id, limit);

    if (competitorAds.length === 0) {
      return NextResponse.json({
        ads: [],
        total: 0,
        message: 'No ads found for this competitor',
      });
    }

    // Optionally enrich with intelligence data
    const detector = getWinnerDetector();
    const estimator = getSpendEstimator();

    const enrichedAds = competitorAds.map((ad) => {
      const winnerEval = detector.evaluateWinner(ad);
      const spendEst = estimator.estimateSpend(ad);

      return {
        ...ad,
        mediaUrls: ad.mediaUrls ? JSON.parse(ad.mediaUrls) : [],
        countryTargeting: ad.countryTargeting ? JSON.parse(ad.countryTargeting) : [],
        analysis: includeAnalysis && ad.analysis ? JSON.parse(ad.analysis) : null,
        intelligence: {
          winner: {
            isWinner: winnerEval.isWinner,
            score: winnerEval.winnerScore,
            tier: winnerEval.tier,
          },
          spend: {
            dailyMin: spendEst.dailySpend.min,
            dailyMax: spendEst.dailySpend.max,
            totalMin: spendEst.totalSpend.min,
            totalMax: spendEst.totalSpend.max,
            isScaling: spendEst.isScaling,
            confidence: spendEst.confidence,
          },
          daysRunning: spendEst.daysRunning,
        },
      };
    });

    // Sort by winner score
    enrichedAds.sort(
      (a, b) => b.intelligence.winner.score - a.intelligence.winner.score
    );

    return NextResponse.json({
      ads: enrichedAds,
      total: enrichedAds.length,
      stats: {
        winners: enrichedAds.filter((a) => a.intelligence.winner.isWinner).length,
        totalEstimatedSpend: enrichedAds.reduce(
          (sum, a) => sum + (a.intelligence.spend.totalMin + a.intelligence.spend.totalMax) / 2,
          0
        ),
        avgDaysRunning:
          enrichedAds.reduce((sum, a) => sum + a.intelligence.daysRunning, 0) /
          enrichedAds.length,
      },
    });
  } catch (error) {
    console.error('Get competitor ads error:', error);
    return NextResponse.json(
      { error: 'Failed to get competitor ads' },
      { status: 500 }
    );
  }
}
