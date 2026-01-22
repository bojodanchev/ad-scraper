import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ads, advertisers } from '@/lib/db/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const mediaType = searchParams.get('mediaType');
    const hasAnalysis = searchParams.get('hasAnalysis');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build conditions
    const conditions = [];

    if (platform) {
      conditions.push(eq(ads.platform, platform));
    }

    if (mediaType) {
      conditions.push(eq(ads.mediaType, mediaType));
    }

    if (hasAnalysis === 'true') {
      conditions.push(sql`${ads.analysis} IS NOT NULL`);
    } else if (hasAnalysis === 'false') {
      conditions.push(sql`${ads.analysis} IS NULL`);
    }

    if (search) {
      conditions.push(
        sql`(${ads.headline} LIKE ${'%' + search + '%'} OR ${ads.bodyText} LIKE ${'%' + search + '%'})`
      );
    }

    // Query ads with advertiser info
    const results = await db
      .select({
        id: ads.id,
        platform: ads.platform,
        advertiserId: ads.advertiserId,
        advertiserName: advertisers.name,
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
        scrapedAt: ads.scrapedAt,
        hasAnalysis: sql<boolean>`${ads.analysis} IS NOT NULL`,
      })
      .from(ads)
      .leftJoin(advertisers, eq(ads.advertiserId, advertisers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ads.scrapedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      ads: results,
      total: countResult[0]?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get ads error:', error);
    return NextResponse.json({ error: 'Failed to get ads' }, { status: 500 });
  }
}
