import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { ads, advertisers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();
    
    const { id } = await params;

    const results = await db
      .select({
        id: ads.id,
        platform: ads.platform,
        advertiserId: ads.advertiserId,
        advertiserName: advertisers.name,
        advertiserPageUrl: advertisers.pageUrl,
        externalId: ads.externalId,
        headline: ads.headline,
        bodyText: ads.bodyText,
        ctaText: ads.ctaText,
        landingUrl: ads.landingUrl,
        mediaType: ads.mediaType,
        mediaUrls: ads.mediaUrls,
        thumbnailUrl: ads.thumbnailUrl,
        impressionsMin: ads.impressionsMin,
        impressionsMax: ads.impressionsMax,
        likes: ads.likes,
        comments: ads.comments,
        shares: ads.shares,
        daysRunning: ads.daysRunning,
        countryTargeting: ads.countryTargeting,
        firstSeenAt: ads.firstSeenAt,
        lastSeenAt: ads.lastSeenAt,
        scrapedAt: ads.scrapedAt,
        analysis: ads.analysis,
      })
      .from(ads)
      .leftJoin(advertisers, eq(ads.advertiserId, advertisers.id))
      .where(eq(ads.id, id))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    const ad = results[0];

    return NextResponse.json({
      ...ad,
      mediaUrls: ad.mediaUrls ? JSON.parse(ad.mediaUrls) : [],
      countryTargeting: ad.countryTargeting
        ? JSON.parse(ad.countryTargeting)
        : [],
      analysis: ad.analysis ? JSON.parse(ad.analysis) : null,
    });
  } catch (error) {
    console.error('Get ad error:', error);
    return NextResponse.json({ error: 'Failed to get ad' }, { status: 500 });
  }
}
