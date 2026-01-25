import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/db/client';
import { getCompetitorTracker } from '@/lib/intelligence';

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const tracker = getCompetitorTracker();
    const competitors = await tracker.getCompetitors(!includeInactive);

    // Get summaries for each
    const competitorsWithStats = await Promise.all(
      competitors.map(async (c) => {
        const summary = await tracker.getCompetitorSummary(c.id);
        return {
          ...c,
          tags: c.tags ? JSON.parse(c.tags) : [],
          alertConfig: c.alertConfig ? JSON.parse(c.alertConfig) : null,
          stats: summary?.stats || null,
          recentActivity: summary?.recentActivity || null,
        };
      })
    );

    return NextResponse.json({
      competitors: competitorsWithStats,
      total: competitorsWithStats.length,
    });
  } catch (error) {
    console.error('Get competitors error:', error);
    return NextResponse.json(
      { error: 'Failed to get competitors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body = await request.json();
    const { platform, pageName, pageId, pageUrl } = body;

    if (!platform || !pageName) {
      return NextResponse.json(
        { error: 'platform and pageName are required' },
        { status: 400 }
      );
    }

    const tracker = getCompetitorTracker();
    const competitor = await tracker.addCompetitor(
      platform,
      pageName,
      pageId,
      pageUrl
    );

    return NextResponse.json({
      message: 'Competitor added',
      competitor,
    });
  } catch (error) {
    console.error('Add competitor error:', error);
    return NextResponse.json(
      { error: 'Failed to add competitor' },
      { status: 500 }
    );
  }
}
