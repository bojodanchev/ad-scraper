import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { ads, adWinnerStatus, advertisers } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '50');
    const minScore = parseFloat(searchParams.get('minScore') || '0.6');

    // Get winner statuses
    const winnerStatuses = await db
      .select()
      .from(adWinnerStatus)
      .where(eq(adWinnerStatus.isWinner, true))
      .orderBy(desc(adWinnerStatus.winnerScore))
      .limit(limit * 2); // Get extra to filter

    if (winnerStatuses.length === 0) {
      return NextResponse.json({ winners: [], total: 0 });
    }

    // Get full ad details
    const adIds = winnerStatuses.map((s) => s.adId);
    const winnerAds = await db
      .select({
        ad: ads,
        advertiser: advertisers,
        winnerStatus: adWinnerStatus,
      })
      .from(ads)
      .leftJoin(advertisers, eq(ads.advertiserId, advertisers.id))
      .leftJoin(adWinnerStatus, eq(ads.id, adWinnerStatus.adId))
      .where(
        platform
          ? and(eq(ads.platform, platform))
          : undefined
      )
      .orderBy(desc(adWinnerStatus.winnerScore))
      .limit(limit);

    // Filter to only winners with adIds from our query
    const filteredWinners = winnerAds.filter(
      (w) =>
        w.winnerStatus &&
        adIds.includes(w.ad.id) &&
        parseFloat(w.winnerStatus.winnerScore || '0') >= minScore
    );

    const winners = filteredWinners.map((w) => ({
      ad: {
        ...w.ad,
        mediaUrls: w.ad.mediaUrls ? JSON.parse(w.ad.mediaUrls) : [],
        countryTargeting: w.ad.countryTargeting
          ? JSON.parse(w.ad.countryTargeting)
          : [],
        analysis: w.ad.analysis ? JSON.parse(w.ad.analysis) : null,
      },
      advertiser: w.advertiser,
      winnerStatus: w.winnerStatus
        ? {
            isWinner: w.winnerStatus.isWinner,
            winnerScore: parseFloat(w.winnerStatus.winnerScore || '0'),
            criteriaMet: JSON.parse(w.winnerStatus.criteriaMet || '{}'),
            evaluatedAt: w.winnerStatus.evaluatedAt,
            becameWinnerAt: w.winnerStatus.becameWinnerAt,
          }
        : null,
    }));

    return NextResponse.json({
      winners,
      total: winners.length,
    });
  } catch (error) {
    console.error('Get winners error:', error);
    return NextResponse.json(
      { error: 'Failed to get winners' },
      { status: 500 }
    );
  }
}
