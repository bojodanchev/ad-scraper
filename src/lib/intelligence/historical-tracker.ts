import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { db, ensureInitialized } from '../db/client';
import { ads, adSnapshots, type Ad, type NewAdSnapshot } from '../db/schema';

export interface SnapshotResult {
  adId: string;
  snapshotId: string;
  date: string;
  metrics: {
    likes: number | null;
    comments: number | null;
    shares: number | null;
    views: number | null;
    impressionsMin: number | null;
    impressionsMax: number | null;
  };
  isActive: boolean;
}

export interface AdHistoryStats {
  adId: string;
  totalSnapshots: number;
  firstSnapshot: string | null;
  lastSnapshot: string | null;
  daysTracked: number;
  metrics: {
    peakLikes: number;
    peakComments: number;
    peakViews: number;
    likeGrowth: number;
    commentGrowth: number;
  };
}

export class HistoricalTracker {
  /**
   * Create a snapshot of current ad metrics
   */
  async createSnapshot(ad: Ad): Promise<SnapshotResult> {
    await ensureInitialized();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if we already have a snapshot for today
    const existingSnapshot = await db
      .select()
      .from(adSnapshots)
      .where(and(eq(adSnapshots.adId, ad.id), eq(adSnapshots.snapshotDate, today)))
      .limit(1);

    if (existingSnapshot.length > 0) {
      // Update existing snapshot with latest metrics
      const snapshot = existingSnapshot[0];
      await db
        .update(adSnapshots)
        .set({
          likes: ad.likes,
          comments: ad.comments,
          shares: ad.shares,
          impressionsMin: ad.impressionsMin,
          impressionsMax: ad.impressionsMax,
          isActive: true,
        })
        .where(eq(adSnapshots.id, snapshot.id));

      return {
        adId: ad.id,
        snapshotId: snapshot.id,
        date: today,
        metrics: {
          likes: ad.likes,
          comments: ad.comments,
          shares: ad.shares,
          views: null,
          impressionsMin: ad.impressionsMin,
          impressionsMax: ad.impressionsMax,
        },
        isActive: true,
      };
    }

    // Create new snapshot
    const snapshotId = nanoid();
    const newSnapshot: NewAdSnapshot = {
      id: snapshotId,
      adId: ad.id,
      snapshotDate: today,
      likes: ad.likes,
      comments: ad.comments,
      shares: ad.shares,
      views: null, // Would need platform-specific fetch
      impressionsMin: ad.impressionsMin,
      impressionsMax: ad.impressionsMax,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await db.insert(adSnapshots).values(newSnapshot);

    // Update ad's lastSeenAt
    await db
      .update(ads)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(eq(ads.id, ad.id));

    return {
      adId: ad.id,
      snapshotId,
      date: today,
      metrics: {
        likes: ad.likes,
        comments: ad.comments,
        shares: ad.shares,
        views: null,
        impressionsMin: ad.impressionsMin,
        impressionsMax: ad.impressionsMax,
      },
      isActive: true,
    };
  }

  /**
   * Mark an ad as inactive (no longer running)
   */
  async markInactive(adId: string): Promise<void> {
    await ensureInitialized();

    const today = new Date().toISOString().split('T')[0];

    // Create or update today's snapshot as inactive
    const existingSnapshot = await db
      .select()
      .from(adSnapshots)
      .where(and(eq(adSnapshots.adId, adId), eq(adSnapshots.snapshotDate, today)))
      .limit(1);

    if (existingSnapshot.length > 0) {
      await db
        .update(adSnapshots)
        .set({ isActive: false })
        .where(eq(adSnapshots.id, existingSnapshot[0].id));
    } else {
      await db.insert(adSnapshots).values({
        id: nanoid(),
        adId,
        snapshotDate: today,
        isActive: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Get snapshot history for an ad
   */
  async getHistory(adId: string, limit = 30): Promise<SnapshotResult[]> {
    await ensureInitialized();

    const snapshots = await db
      .select()
      .from(adSnapshots)
      .where(eq(adSnapshots.adId, adId))
      .orderBy(adSnapshots.snapshotDate)
      .limit(limit);

    return snapshots.map((s) => ({
      adId: s.adId,
      snapshotId: s.id,
      date: s.snapshotDate,
      metrics: {
        likes: s.likes,
        comments: s.comments,
        shares: s.shares,
        views: s.views,
        impressionsMin: s.impressionsMin,
        impressionsMax: s.impressionsMax,
      },
      isActive: s.isActive ?? true,
    }));
  }

  /**
   * Get aggregated history stats for an ad
   */
  async getHistoryStats(adId: string): Promise<AdHistoryStats | null> {
    await ensureInitialized();

    const snapshots = await db
      .select()
      .from(adSnapshots)
      .where(eq(adSnapshots.adId, adId))
      .orderBy(adSnapshots.snapshotDate);

    if (snapshots.length === 0) {
      return null;
    }

    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];

    // Calculate peaks
    let peakLikes = 0;
    let peakComments = 0;
    let peakViews = 0;

    for (const s of snapshots) {
      if (s.likes && s.likes > peakLikes) peakLikes = s.likes;
      if (s.comments && s.comments > peakComments) peakComments = s.comments;
      if (s.views && s.views > peakViews) peakViews = s.views;
    }

    // Calculate growth (first to last)
    const likeGrowth =
      (lastSnapshot.likes || 0) - (firstSnapshot.likes || 0);
    const commentGrowth =
      (lastSnapshot.comments || 0) - (firstSnapshot.comments || 0);

    // Calculate days tracked
    const firstDate = new Date(firstSnapshot.snapshotDate);
    const lastDate = new Date(lastSnapshot.snapshotDate);
    const daysTracked = Math.ceil(
      (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      adId,
      totalSnapshots: snapshots.length,
      firstSnapshot: firstSnapshot.snapshotDate,
      lastSnapshot: lastSnapshot.snapshotDate,
      daysTracked,
      metrics: {
        peakLikes,
        peakComments,
        peakViews,
        likeGrowth,
        commentGrowth,
      },
    };
  }

  /**
   * Batch create snapshots for all ads
   */
  async createBatchSnapshots(limit = 100): Promise<{ processed: number; errors: number }> {
    await ensureInitialized();

    // Get ads that need snapshots (haven't been snapshotted today)
    const today = new Date().toISOString().split('T')[0];

    const allAds = await db.select().from(ads).limit(limit);

    let processed = 0;
    let errors = 0;

    for (const ad of allAds) {
      try {
        await this.createSnapshot(ad);
        processed++;
      } catch (error) {
        console.error(`Failed to snapshot ad ${ad.id}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  }
}

// Singleton
let trackerInstance: HistoricalTracker | null = null;

export function getHistoricalTracker(): HistoricalTracker {
  if (!trackerInstance) {
    trackerInstance = new HistoricalTracker();
  }
  return trackerInstance;
}
