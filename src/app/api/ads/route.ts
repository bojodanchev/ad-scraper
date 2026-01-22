import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { ads, advertisers } from '@/lib/db/schema';
import { eq, desc, asc, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const mediaType = searchParams.get('mediaType');
    const hasAnalysis = searchParams.get('hasAnalysis');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Sorting params
    const sortBy = searchParams.get('sortBy') || 'scrapedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Days running filter
    const minDaysRunning = searchParams.get('minDaysRunning');
    const maxDaysRunning = searchParams.get('maxDaysRunning');

    // Exclude DCO ads (ads with template variables like {{product.name}})
    const excludeDco = searchParams.get('excludeDco') === 'true';

    // Time period filter (when content was first seen/posted)
    const timePeriod = searchParams.get('timePeriod');

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

    // Days running filters - need to handle NULL values
    if (minDaysRunning) {
      const minDays = parseInt(minDaysRunning);
      conditions.push(sql`${ads.daysRunning} IS NOT NULL AND ${ads.daysRunning} >= ${minDays}`);
    }
    if (maxDaysRunning) {
      const maxDays = parseInt(maxDaysRunning);
      conditions.push(sql`${ads.daysRunning} IS NOT NULL AND ${ads.daysRunning} <= ${maxDays}`);
    }

    // Exclude DCO ads with template variables like {{product.name}}
    // Split into separate conditions to ensure proper SQL generation
    if (excludeDco) {
      conditions.push(
        sql`(${ads.headline} IS NULL OR ${ads.headline} NOT LIKE '%{{%')`
      );
      conditions.push(
        sql`(${ads.bodyText} IS NULL OR ${ads.bodyText} NOT LIKE '%{{%')`
      );
    }

    // Time period filter - filter by firstSeenAt (when content was posted)
    if (timePeriod) {
      const timePeriodDays: Record<string, number> = {
        '48h': 2,
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };
      const days = timePeriodDays[timePeriod];
      if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffIso = cutoffDate.toISOString();
        conditions.push(
          sql`${ads.firstSeenAt} IS NOT NULL AND ${ads.firstSeenAt} >= ${cutoffIso}`
        );
      }
    }

    // Determine sort column and direction
    // For daysRunning, use COALESCE to handle NULLs (put them at the end)
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Build order by clause - handle NULL values for various columns
    let orderByClause;
    const nullDefault = sortOrder === 'asc' ? 99999999 : 0;

    switch (sortBy) {
      case 'daysRunning':
        orderByClause = sortOrder === 'asc'
          ? sql`COALESCE(${ads.daysRunning}, ${nullDefault}) ASC`
          : sql`COALESCE(${ads.daysRunning}, ${nullDefault}) DESC`;
        break;
      case 'likes':
        orderByClause = sortOrder === 'asc'
          ? sql`COALESCE(${ads.likes}, ${nullDefault}) ASC`
          : sql`COALESCE(${ads.likes}, ${nullDefault}) DESC`;
        break;
      case 'views':
        // impressionsMin is used for views/plays
        orderByClause = sortOrder === 'asc'
          ? sql`COALESCE(${ads.impressionsMin}, ${nullDefault}) ASC`
          : sql`COALESCE(${ads.impressionsMin}, ${nullDefault}) DESC`;
        break;
      case 'comments':
        orderByClause = sortOrder === 'asc'
          ? sql`COALESCE(${ads.comments}, ${nullDefault}) ASC`
          : sql`COALESCE(${ads.comments}, ${nullDefault}) DESC`;
        break;
      case 'shares':
        orderByClause = sortOrder === 'asc'
          ? sql`COALESCE(${ads.shares}, ${nullDefault}) ASC`
          : sql`COALESCE(${ads.shares}, ${nullDefault}) DESC`;
        break;
      default:
        orderByClause = orderFn(ads.scrapedAt);
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
      .orderBy(orderByClause)
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
