import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { advertisers, ads } from '@/lib/db/schema';
import { eq, desc, asc, and, sql, count, avg } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'followerCount';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const minFollowers = searchParams.get('minFollowers');
    const maxFollowers = searchParams.get('maxFollowers');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build conditions
    const conditions = [];

    if (platform) {
      conditions.push(eq(advertisers.platform, platform));
    }

    if (search) {
      conditions.push(
        sql`(${advertisers.name} LIKE ${'%' + search + '%'} OR ${advertisers.username} LIKE ${'%' + search + '%'})`
      );
    }

    if (minFollowers) {
      conditions.push(
        sql`${advertisers.followerCount} >= ${parseInt(minFollowers)}`
      );
    }

    if (maxFollowers) {
      conditions.push(
        sql`${advertisers.followerCount} <= ${parseInt(maxFollowers)}`
      );
    }

    // Sort order
    const orderFn = sortOrder === 'asc' ? asc : desc;
    const nullDefault = sortOrder === 'asc' ? 99999999 : 0;

    // Build order clause
    let orderByClause;
    switch (sortBy) {
      case 'followerCount':
        orderByClause = sql`COALESCE(${advertisers.followerCount}, ${nullDefault}) ${sortOrder === 'asc' ? sql`ASC` : sql`DESC`}`;
        break;
      case 'totalLikes':
        orderByClause = sql`COALESCE(${advertisers.totalLikes}, ${nullDefault}) ${sortOrder === 'asc' ? sql`ASC` : sql`DESC`}`;
        break;
      case 'engagementRate':
        orderByClause = sql`COALESCE(CAST(${advertisers.engagementRate} AS REAL), ${nullDefault}) ${sortOrder === 'asc' ? sql`ASC` : sql`DESC`}`;
        break;
      case 'postsCount':
        // This will be calculated from ads
        orderByClause = orderFn(advertisers.lastScrapedAt);
        break;
      case 'name':
        orderByClause = orderFn(advertisers.name);
        break;
      default:
        orderByClause = sql`COALESCE(${advertisers.followerCount}, 0) DESC`;
    }

    // Get creators with their ad counts
    const creatorsQuery = db
      .select({
        id: advertisers.id,
        platform: advertisers.platform,
        name: advertisers.name,
        username: advertisers.username,
        pageUrl: advertisers.pageUrl,
        avatarUrl: advertisers.avatarUrl,
        bio: advertisers.bio,
        verified: advertisers.verified,
        followerCount: advertisers.followerCount,
        followingCount: advertisers.followingCount,
        totalLikes: advertisers.totalLikes,
        postsCount: advertisers.postsCount,
        avgLikesPerPost: advertisers.avgLikesPerPost,
        avgViewsPerPost: advertisers.avgViewsPerPost,
        avgCommentsPerPost: advertisers.avgCommentsPerPost,
        engagementRate: advertisers.engagementRate,
        firstSeenAt: advertisers.firstSeenAt,
        lastScrapedAt: advertisers.lastScrapedAt,
        isTracked: advertisers.isTracked,
      })
      .from(advertisers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const creators = await creatorsQuery;

    // Get ad counts for each creator
    const creatorIds = creators.map(c => c.id);
    const adCounts = await db
      .select({
        advertiserId: ads.advertiserId,
        adCount: count(),
        avgLikes: avg(ads.likes),
        avgViews: avg(ads.impressionsMin),
        avgComments: avg(ads.comments),
      })
      .from(ads)
      .where(sql`${ads.advertiserId} IN (${creatorIds.length > 0 ? creatorIds.join("','") : "''"})`)
      .groupBy(ads.advertiserId);

    // Create a map of ad counts
    const adCountMap = new Map(
      adCounts.map(ac => [ac.advertiserId, {
        adCount: Number(ac.adCount),
        avgLikes: ac.avgLikes ? Math.round(Number(ac.avgLikes)) : null,
        avgViews: ac.avgViews ? Math.round(Number(ac.avgViews)) : null,
        avgComments: ac.avgComments ? Math.round(Number(ac.avgComments)) : null,
      }])
    );

    // Merge data
    const creatorsWithStats = creators.map(creator => {
      const stats = adCountMap.get(creator.id) || { adCount: 0, avgLikes: null, avgViews: null, avgComments: null };

      // Calculate view-to-follower ratio if we have both
      let viewToFollowerRatio: number | null = null;
      if (creator.followerCount && creator.followerCount > 0 && stats.avgViews) {
        viewToFollowerRatio = Math.round((stats.avgViews / creator.followerCount) * 100) / 100;
      }

      // Calculate engagement rate if not already set
      let calculatedEngagementRate = creator.engagementRate ? parseFloat(creator.engagementRate) : null;
      if (!calculatedEngagementRate && stats.avgViews && stats.avgViews > 0) {
        const engagement = (stats.avgLikes || 0) + (stats.avgComments || 0);
        calculatedEngagementRate = Math.round((engagement / stats.avgViews) * 10000) / 100;
      }

      return {
        ...creator,
        adCount: stats.adCount,
        avgLikesPerPost: creator.avgLikesPerPost || stats.avgLikes,
        avgViewsPerPost: creator.avgViewsPerPost || stats.avgViews,
        avgCommentsPerPost: creator.avgCommentsPerPost || stats.avgComments,
        engagementRate: calculatedEngagementRate?.toFixed(2) || null,
        viewToFollowerRatio,
      };
    });

    // Get total count for pagination
    const countResult = await db
      .select({ count: count() })
      .from(advertisers)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      creators: creatorsWithStats,
      total: countResult[0]?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get creators error:', error);
    return NextResponse.json({ error: 'Failed to get creators' }, { status: 500 });
  }
}
