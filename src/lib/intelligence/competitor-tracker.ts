import { nanoid } from 'nanoid';
import { eq, and, desc } from 'drizzle-orm';
import { db, ensureInitialized } from '../db/client';
import {
  trackedCompetitors,
  ads,
  advertisers,
  type TrackedCompetitor,
  type NewTrackedCompetitor,
  type Ad,
} from '../db/schema';

export interface CompetitorSummary {
  id: string;
  platform: string;
  pageName: string;
  pageUrl: string | null;
  avatarUrl: string | null;
  trackingSince: string;
  lastChecked: string | null;
  stats: {
    totalAds: number;
    activeAds: number;
    avgDaysRunning: number;
    topPerformingAd: Ad | null;
  };
  recentActivity: {
    newAdsLast7Days: number;
    removedAdsLast7Days: number;
  };
}

export interface CompetitorAlert {
  type: 'new_ad' | 'scaling' | 'new_campaign' | 'ad_removed';
  competitorId: string;
  competitorName: string;
  message: string;
  adId?: string;
  timestamp: string;
}

export class CompetitorTracker {
  /**
   * Add a competitor to track
   */
  async addCompetitor(
    platform: string,
    pageName: string,
    pageId?: string,
    pageUrl?: string
  ): Promise<TrackedCompetitor> {
    await ensureInitialized();

    // Check if already tracking
    const existing = await db
      .select()
      .from(trackedCompetitors)
      .where(
        and(
          eq(trackedCompetitors.platform, platform),
          eq(trackedCompetitors.pageName, pageName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Reactivate if inactive
      if (!existing[0].isActive) {
        await db
          .update(trackedCompetitors)
          .set({ isActive: true })
          .where(eq(trackedCompetitors.id, existing[0].id));
      }
      return existing[0];
    }

    const newCompetitor: NewTrackedCompetitor = {
      id: nanoid(),
      platform,
      pageId,
      pageName,
      pageUrl,
      trackingSince: new Date().toISOString(),
      totalAdsTracked: 0,
      activeAdsCount: 0,
      alertsEnabled: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await db.insert(trackedCompetitors).values(newCompetitor);

    return newCompetitor as TrackedCompetitor;
  }

  /**
   * Remove (deactivate) a competitor
   */
  async removeCompetitor(competitorId: string): Promise<void> {
    await ensureInitialized();

    await db
      .update(trackedCompetitors)
      .set({ isActive: false })
      .where(eq(trackedCompetitors.id, competitorId));
  }

  /**
   * Get all tracked competitors
   */
  async getCompetitors(activeOnly = true): Promise<TrackedCompetitor[]> {
    await ensureInitialized();

    if (activeOnly) {
      return db
        .select()
        .from(trackedCompetitors)
        .where(eq(trackedCompetitors.isActive, true))
        .orderBy(trackedCompetitors.pageName);
    }

    return db.select().from(trackedCompetitors).orderBy(trackedCompetitors.pageName);
  }

  /**
   * Get competitor by ID
   */
  async getCompetitor(competitorId: string): Promise<TrackedCompetitor | null> {
    await ensureInitialized();

    const results = await db
      .select()
      .from(trackedCompetitors)
      .where(eq(trackedCompetitors.id, competitorId))
      .limit(1);

    return results[0] || null;
  }

  /**
   * Get competitor summary with stats
   */
  async getCompetitorSummary(competitorId: string): Promise<CompetitorSummary | null> {
    await ensureInitialized();

    const competitor = await this.getCompetitor(competitorId);
    if (!competitor) return null;

    // Get advertiser linked to this competitor
    const advertiserResults = await db
      .select()
      .from(advertisers)
      .where(
        and(
          eq(advertisers.platform, competitor.platform),
          eq(advertisers.name, competitor.pageName)
        )
      )
      .limit(1);

    const advertiser = advertiserResults[0];

    // Get ads for this competitor
    let competitorAds: Ad[] = [];
    if (advertiser) {
      competitorAds = await db
        .select()
        .from(ads)
        .where(eq(ads.advertiserId, advertiser.id))
        .orderBy(desc(ads.scrapedAt));
    }

    // Calculate stats
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let totalDaysRunning = 0;
    let activeCount = 0;
    let newAdsLast7Days = 0;
    let topPerformingAd: Ad | null = null;
    let topScore = 0;

    for (const ad of competitorAds) {
      // Check if active
      if (ad.lastSeenAt) {
        const lastSeen = new Date(ad.lastSeenAt).getTime();
        if (now - lastSeen < 7 * 24 * 60 * 60 * 1000) {
          activeCount++;
        }
      }

      // Calculate days running
      if (ad.firstSeenAt) {
        const firstSeen = new Date(ad.firstSeenAt).getTime();
        const lastSeen = ad.lastSeenAt ? new Date(ad.lastSeenAt).getTime() : now;
        totalDaysRunning += Math.ceil((lastSeen - firstSeen) / (1000 * 60 * 60 * 24));

        // Check if new in last 7 days
        if (firstSeen > sevenDaysAgo) {
          newAdsLast7Days++;
        }
      }

      // Score for top performing
      const score =
        (ad.likes || 0) * 1 +
        (ad.comments || 0) * 5 +
        (ad.shares || 0) * 10 +
        (ad.daysRunning || 0) * 2;

      if (score > topScore) {
        topScore = score;
        topPerformingAd = ad;
      }
    }

    const avgDaysRunning =
      competitorAds.length > 0 ? Math.round(totalDaysRunning / competitorAds.length) : 0;

    return {
      id: competitor.id,
      platform: competitor.platform,
      pageName: competitor.pageName,
      pageUrl: competitor.pageUrl,
      avatarUrl: competitor.avatarUrl,
      trackingSince: competitor.trackingSince || '',
      lastChecked: competitor.lastChecked,
      stats: {
        totalAds: competitorAds.length,
        activeAds: activeCount,
        avgDaysRunning,
        topPerformingAd,
      },
      recentActivity: {
        newAdsLast7Days,
        removedAdsLast7Days: 0, // Would need historical tracking
      },
    };
  }

  /**
   * Get ads for a competitor
   */
  async getCompetitorAds(competitorId: string, limit = 50): Promise<Ad[]> {
    await ensureInitialized();

    const competitor = await this.getCompetitor(competitorId);
    if (!competitor) return [];

    // Find advertiser
    const advertiserResults = await db
      .select()
      .from(advertisers)
      .where(
        and(
          eq(advertisers.platform, competitor.platform),
          eq(advertisers.name, competitor.pageName)
        )
      )
      .limit(1);

    const advertiser = advertiserResults[0];
    if (!advertiser) return [];

    return db
      .select()
      .from(ads)
      .where(eq(ads.advertiserId, advertiser.id))
      .orderBy(desc(ads.scrapedAt))
      .limit(limit);
  }

  /**
   * Update competitor stats after a scrape
   */
  async updateCompetitorStats(competitorId: string): Promise<void> {
    await ensureInitialized();

    const summary = await this.getCompetitorSummary(competitorId);
    if (!summary) return;

    await db
      .update(trackedCompetitors)
      .set({
        totalAdsTracked: summary.stats.totalAds,
        activeAdsCount: summary.stats.activeAds,
        lastChecked: new Date().toISOString(),
      })
      .where(eq(trackedCompetitors.id, competitorId));
  }

  /**
   * Update notes for a competitor
   */
  async updateNotes(competitorId: string, notes: string): Promise<void> {
    await ensureInitialized();

    await db
      .update(trackedCompetitors)
      .set({ notes })
      .where(eq(trackedCompetitors.id, competitorId));
  }

  /**
   * Update tags for a competitor
   */
  async updateTags(competitorId: string, tags: string[]): Promise<void> {
    await ensureInitialized();

    await db
      .update(trackedCompetitors)
      .set({ tags: JSON.stringify(tags) })
      .where(eq(trackedCompetitors.id, competitorId));
  }

  /**
   * Toggle alerts for a competitor
   */
  async toggleAlerts(competitorId: string, enabled: boolean): Promise<void> {
    await ensureInitialized();

    await db
      .update(trackedCompetitors)
      .set({ alertsEnabled: enabled })
      .where(eq(trackedCompetitors.id, competitorId));
  }
}

// Singleton
let trackerInstance: CompetitorTracker | null = null;

export function getCompetitorTracker(): CompetitorTracker {
  if (!trackerInstance) {
    trackerInstance = new CompetitorTracker();
  }
  return trackerInstance;
}
