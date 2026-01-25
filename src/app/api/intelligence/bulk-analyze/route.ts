import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/db/client';
import { ads, audienceInference, spendEstimates, adWinnerStatus } from '@/lib/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';
import {
  getAudienceInferenceEngine,
  getSpendEstimator,
  getWinnerDetector,
} from '@/lib/intelligence';

export const maxDuration = 300; // 5 minutes for bulk operations

interface BulkAnalyzeOptions {
  inferAudience?: boolean;
  estimateSpend?: boolean;
  evaluateWinners?: boolean;
  limit?: number;
  platform?: string;
}

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();

    const body: BulkAnalyzeOptions = await request.json();
    const {
      inferAudience = false,
      estimateSpend = true,
      evaluateWinners = true,
      limit = 50,
      platform,
    } = body;

    const results = {
      audienceInference: { processed: 0, errors: 0 },
      spendEstimates: { processed: 0, errors: 0 },
      winnerEvaluations: { processed: 0, errors: 0, winnersFound: 0 },
    };

    // Get ads to process
    let adsToProcess = await db
      .select()
      .from(ads)
      .orderBy(desc(ads.scrapedAt))
      .limit(limit);

    if (platform) {
      adsToProcess = adsToProcess.filter((ad) => ad.platform === platform);
    }

    // Audience Inference (uses Gemini - rate limited)
    if (inferAudience) {
      const engine = getAudienceInferenceEngine();

      // Get ads without audience inference
      const adsWithoutInference = [];
      for (const ad of adsToProcess) {
        const existing = await db
          .select()
          .from(audienceInference)
          .where(eq(audienceInference.adId, ad.id))
          .limit(1);
        if (existing.length === 0) {
          adsWithoutInference.push(ad);
        }
      }

      // Process with rate limiting (max 10 at a time)
      const batchSize = Math.min(10, adsWithoutInference.length);
      for (let i = 0; i < batchSize; i++) {
        const ad = adsWithoutInference[i];
        try {
          const result = await engine.inferFromAd(ad);
          if (result) {
            const dbRecord = engine.toDbRecord(ad.id, result);
            await db.insert(audienceInference).values(dbRecord);
            results.audienceInference.processed++;
          }
        } catch (error) {
          console.error(`Audience inference failed for ad ${ad.id}:`, error);
          results.audienceInference.errors++;
        }

        // Small delay between API calls
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Spend Estimation (local calculation - fast)
    if (estimateSpend) {
      const estimator = getSpendEstimator();

      for (const ad of adsToProcess) {
        try {
          const result = estimator.estimateSpend(ad);
          const dbRecord = estimator.toDbRecord(ad.id, result);

          // Upsert
          const existing = await db
            .select()
            .from(spendEstimates)
            .where(eq(spendEstimates.adId, ad.id))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(spendEstimates)
              .set({ ...dbRecord, id: existing[0].id })
              .where(eq(spendEstimates.id, existing[0].id));
          } else {
            await db.insert(spendEstimates).values(dbRecord);
          }

          results.spendEstimates.processed++;
        } catch (error) {
          console.error(`Spend estimation failed for ad ${ad.id}:`, error);
          results.spendEstimates.errors++;
        }
      }
    }

    // Winner Evaluation (local calculation - fast)
    if (evaluateWinners) {
      const detector = getWinnerDetector();

      for (const ad of adsToProcess) {
        try {
          const result = detector.evaluateWinner(ad);
          const dbRecord = detector.toDbRecord(ad.id, result);

          // Upsert
          const existing = await db
            .select()
            .from(adWinnerStatus)
            .where(eq(adWinnerStatus.adId, ad.id))
            .limit(1);

          if (existing.length > 0) {
            const becameWinnerAt = existing[0].isWinner
              ? existing[0].becameWinnerAt
              : result.isWinner
                ? new Date().toISOString()
                : null;

            await db
              .update(adWinnerStatus)
              .set({ ...dbRecord, id: existing[0].id, becameWinnerAt })
              .where(eq(adWinnerStatus.id, existing[0].id));
          } else {
            await db.insert(adWinnerStatus).values(dbRecord);
          }

          results.winnerEvaluations.processed++;
          if (result.isWinner) {
            results.winnerEvaluations.winnersFound++;
          }
        } catch (error) {
          console.error(`Winner evaluation failed for ad ${ad.id}:`, error);
          results.winnerEvaluations.errors++;
        }
      }
    }

    return NextResponse.json({
      message: 'Bulk analysis complete',
      results,
      adsProcessed: adsToProcess.length,
    });
  } catch (error) {
    console.error('Bulk analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to run bulk analysis' },
      { status: 500 }
    );
  }
}
