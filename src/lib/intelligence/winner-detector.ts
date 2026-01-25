import { nanoid } from 'nanoid';
import type { Ad, NewAdWinnerStatus } from '../db/schema';
import { getSpendEstimator, SpendEstimateResult } from './spend-estimator';

export interface WinnerCriteria {
  name: string;
  met: boolean;
  weight: number;
  reason: string;
}

export interface WinnerEvaluationResult {
  isWinner: boolean;
  winnerScore: number; // 0-1 probability
  criteria: WinnerCriteria[];
  recommendation: string;
  tier: 'proven_winner' | 'likely_winner' | 'potential' | 'testing' | 'weak';
}

// Winner thresholds
const WINNER_THRESHOLDS = {
  proven_winner: 0.8,
  likely_winner: 0.6,
  potential: 0.4,
  testing: 0.2,
};

export class WinnerDetector {
  private spendEstimator = getSpendEstimator();

  /**
   * Calculate days running from dates
   */
  private getDaysRunning(ad: Ad): number {
    if (!ad.firstSeenAt) return 0;

    const first = new Date(ad.firstSeenAt);
    const last = ad.lastSeenAt ? new Date(ad.lastSeenAt) : new Date();

    return Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
  }

  /**
   * Evaluate winner criteria for an ad
   */
  evaluateWinner(ad: Ad, spendEstimate?: SpendEstimateResult): WinnerEvaluationResult {
    const daysRunning = this.getDaysRunning(ad);
    const estimate = spendEstimate || this.spendEstimator.estimateSpend(ad);
    const criteria: WinnerCriteria[] = [];

    // Criterion 1: Longevity (most important signal)
    const longevityScore = Math.min(daysRunning / 30, 1); // Max out at 30 days
    criteria.push({
      name: 'longevity',
      met: daysRunning >= 14,
      weight: 0.35,
      reason: daysRunning >= 30
        ? `Running ${daysRunning} days - proven evergreen`
        : daysRunning >= 14
          ? `Running ${daysRunning} days - profitable`
          : daysRunning >= 7
            ? `Running ${daysRunning} days - showing promise`
            : `Only ${daysRunning} days - still testing`,
    });

    // Criterion 2: Scaling signals
    criteria.push({
      name: 'scaling',
      met: estimate.isScaling,
      weight: 0.25,
      reason: estimate.isScaling
        ? `Scaling signals detected (${Math.round(estimate.scalingScore * 100)}% confidence)`
        : 'No strong scaling signals',
    });

    // Criterion 3: Engagement (if available)
    const hasEngagement = !!(ad.likes || ad.comments || ad.shares);
    const engagementScore =
      hasEngagement
        ? Math.min(
            ((ad.likes || 0) / 5000 + (ad.comments || 0) / 500 + (ad.shares || 0) / 200) / 3,
            1
          )
        : 0;
    criteria.push({
      name: 'engagement',
      met: engagementScore >= 0.3,
      weight: 0.15,
      reason: hasEngagement
        ? `Engagement: ${ad.likes || 0} likes, ${ad.comments || 0} comments, ${ad.shares || 0} shares`
        : 'No engagement data available',
    });

    // Criterion 4: Impression volume (for Meta ads)
    const hasImpressions = !!(ad.impressionsMin || ad.impressionsMax);
    const impressionScore = hasImpressions
      ? Math.min((ad.impressionsMax || 0) / 500000, 1)
      : 0.5; // Neutral if no data
    criteria.push({
      name: 'reach',
      met: (ad.impressionsMax || 0) >= 50000,
      weight: 0.15,
      reason: hasImpressions
        ? `Impressions: ${(ad.impressionsMin || 0).toLocaleString()} - ${(ad.impressionsMax || 0).toLocaleString()}`
        : 'No impression data - using run time as proxy',
    });

    // Criterion 5: Still active (recent lastSeen)
    const daysSinceLastSeen = ad.lastSeenAt
      ? Math.ceil((Date.now() - new Date(ad.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const isActive = daysSinceLastSeen <= 7;
    criteria.push({
      name: 'active',
      met: isActive,
      weight: 0.1,
      reason: isActive
        ? `Last seen ${daysSinceLastSeen} days ago - still running`
        : `Last seen ${daysSinceLastSeen} days ago - may be paused`,
    });

    // Calculate weighted score
    let totalWeight = 0;
    let weightedSum = 0;

    for (const criterion of criteria) {
      totalWeight += criterion.weight;

      // Use graduated scoring for some criteria
      let score = 0;
      if (criterion.name === 'longevity') {
        score = longevityScore * criterion.weight;
      } else if (criterion.name === 'engagement') {
        score = engagementScore * criterion.weight;
      } else if (criterion.name === 'reach') {
        score = impressionScore * criterion.weight;
      } else if (criterion.name === 'scaling') {
        score = estimate.scalingScore * criterion.weight;
      } else {
        score = criterion.met ? criterion.weight : 0;
      }

      weightedSum += score;
    }

    const winnerScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const isWinner = winnerScore >= WINNER_THRESHOLDS.likely_winner;

    // Determine tier
    let tier: WinnerEvaluationResult['tier'];
    if (winnerScore >= WINNER_THRESHOLDS.proven_winner) {
      tier = 'proven_winner';
    } else if (winnerScore >= WINNER_THRESHOLDS.likely_winner) {
      tier = 'likely_winner';
    } else if (winnerScore >= WINNER_THRESHOLDS.potential) {
      tier = 'potential';
    } else if (winnerScore >= WINNER_THRESHOLDS.testing) {
      tier = 'testing';
    } else {
      tier = 'weak';
    }

    // Generate recommendation
    let recommendation: string;
    switch (tier) {
      case 'proven_winner':
        recommendation =
          'Proven winner - study this ad closely for hooks, angles, and offer structure. Consider modeling.';
        break;
      case 'likely_winner':
        recommendation =
          'Likely winner - strong performance signals. Worth adding to swipe file.';
        break;
      case 'potential':
        recommendation =
          'Showing potential - monitor for continued performance before modeling.';
        break;
      case 'testing':
        recommendation =
          'Still in testing phase - too early to determine winner status.';
        break;
      default:
        recommendation =
          'Weak signals - likely not performing well or just starting.';
    }

    return {
      isWinner,
      winnerScore,
      criteria,
      recommendation,
      tier,
    };
  }

  /**
   * Convert result to database record
   */
  toDbRecord(adId: string, result: WinnerEvaluationResult): NewAdWinnerStatus {
    return {
      id: nanoid(),
      adId,
      isWinner: result.isWinner,
      winnerScore: result.winnerScore.toString(),
      criteriaMet: JSON.stringify(
        result.criteria.reduce(
          (acc, c) => {
            acc[c.name] = c.met;
            return acc;
          },
          {} as Record<string, boolean>
        )
      ),
      evaluatedAt: new Date().toISOString(),
      becameWinnerAt: result.isWinner ? new Date().toISOString() : null,
    };
  }
}

// Singleton
let detectorInstance: WinnerDetector | null = null;

export function getWinnerDetector(): WinnerDetector {
  if (!detectorInstance) {
    detectorInstance = new WinnerDetector();
  }
  return detectorInstance;
}
