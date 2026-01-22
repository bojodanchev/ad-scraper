import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { advertisers, ads } from '@/lib/db/schema';
import { eq, desc, sql, count, avg, sum } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;

    // Get creator info
    const creatorResult = await db
      .select()
      .from(advertisers)
      .where(eq(advertisers.id, id))
      .limit(1);

    if (creatorResult.length === 0) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const creator = creatorResult[0];

    // Get aggregated stats from their ads
    const statsResult = await db
      .select({
        adCount: count(),
        totalLikes: sum(ads.likes),
        totalViews: sum(ads.impressionsMin),
        totalComments: sum(ads.comments),
        totalShares: sum(ads.shares),
        avgLikes: avg(ads.likes),
        avgViews: avg(ads.impressionsMin),
        avgComments: avg(ads.comments),
        avgShares: avg(ads.shares),
        avgDaysRunning: avg(ads.daysRunning),
      })
      .from(ads)
      .where(eq(ads.advertiserId, id));

    const stats = statsResult[0] || {};

    // Calculate engagement metrics
    const avgLikes = stats.avgLikes ? Math.round(Number(stats.avgLikes)) : null;
    const avgViews = stats.avgViews ? Math.round(Number(stats.avgViews)) : null;
    const avgComments = stats.avgComments ? Math.round(Number(stats.avgComments)) : null;
    const avgShares = stats.avgShares ? Math.round(Number(stats.avgShares)) : null;

    // Calculate engagement rate
    let engagementRate: number | null = null;
    if (avgViews && avgViews > 0) {
      const engagement = (avgLikes || 0) + (avgComments || 0);
      engagementRate = Math.round((engagement / avgViews) * 10000) / 100;
    }

    // Calculate view-to-follower ratio
    let viewToFollowerRatio: number | null = null;
    if (creator.followerCount && creator.followerCount > 0 && avgViews) {
      viewToFollowerRatio = Math.round((avgViews / creator.followerCount) * 100) / 100;
    }

    // Get their recent posts
    const recentPosts = await db
      .select({
        id: ads.id,
        externalId: ads.externalId,
        headline: ads.headline,
        bodyText: ads.bodyText,
        mediaType: ads.mediaType,
        thumbnailUrl: ads.thumbnailUrl,
        landingUrl: ads.landingUrl,
        likes: ads.likes,
        comments: ads.comments,
        shares: ads.shares,
        impressionsMin: ads.impressionsMin,
        daysRunning: ads.daysRunning,
        firstSeenAt: ads.firstSeenAt,
        scrapedAt: ads.scrapedAt,
      })
      .from(ads)
      .where(eq(ads.advertiserId, id))
      .orderBy(desc(ads.likes))
      .limit(20);

    return NextResponse.json({
      creator: {
        ...creator,
        // Calculated stats
        adCount: Number(stats.adCount) || 0,
        totalLikes: stats.totalLikes ? Number(stats.totalLikes) : null,
        totalViews: stats.totalViews ? Number(stats.totalViews) : null,
        totalComments: stats.totalComments ? Number(stats.totalComments) : null,
        totalShares: stats.totalShares ? Number(stats.totalShares) : null,
        avgLikesPerPost: avgLikes,
        avgViewsPerPost: avgViews,
        avgCommentsPerPost: avgComments,
        avgSharesPerPost: avgShares,
        avgDaysRunning: stats.avgDaysRunning ? Math.round(Number(stats.avgDaysRunning)) : null,
        engagementRate: engagementRate?.toFixed(2) || creator.engagementRate,
        viewToFollowerRatio,
      },
      posts: recentPosts,
    });
  } catch (error) {
    console.error('Get creator error:', error);
    return NextResponse.json({ error: 'Failed to get creator' }, { status: 500 });
  }
}
