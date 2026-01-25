import { nanoid } from 'nanoid';
import type { Ad, NewSpendEstimate } from '../db/schema';

// CPM benchmarks by niche (based on industry data)
// These are median CPMs in USD
const CPM_BENCHMARKS: Record<string, { low: number; median: number; high: number }> = {
  ecommerce: { low: 8, median: 12, high: 18 },
  dropshipping: { low: 6, median: 10, high: 15 },
  saas: { low: 15, median: 22, high: 35 },
  finance: { low: 20, median: 30, high: 50 },
  crypto: { low: 25, median: 40, high: 60 },
  health: { low: 12, median: 18, high: 28 },
  fitness: { low: 10, median: 15, high: 22 },
  beauty: { low: 8, median: 14, high: 20 },
  education: { low: 12, median: 18, high: 25 },
  realestate: { low: 18, median: 28, high: 45 },
  mmo: { low: 8, median: 14, high: 22 }, // Make Money Online
  other: { low: 10, median: 15, high: 25 },
};

// Daily impression estimates based on scaling signals
const DAILY_IMPRESSIONS = {
  testing: { min: 1000, max: 5000 },      // New ad, small budget
  scaling: { min: 10000, max: 50000 },    // Proven ad, increasing spend
  mature: { min: 50000, max: 200000 },    // Long-running winner
};

export interface ScalingSignal {
  signal: string;
  detected: boolean;
  weight: number;
  reason: string;
}

export interface SpendEstimateResult {
  daysRunning: number;
  firstSeen: string;
  lastSeen: string;

  // Spend estimates
  dailySpend: { min: number; max: number };
  totalSpend: { min: number; max: number };

  // Scaling analysis
  isScaling: boolean;
  scalingSignals: ScalingSignal[];
  scalingScore: number; // 0-1

  // Metadata
  niche: string;
  cpmUsed: { low: number; median: number; high: number };
  confidence: 'low' | 'medium' | 'high';
  confidenceReasons: string[];
}

export class SpendEstimator {
  /**
   * Calculate days running from first/last seen dates
   */
  private calculateDaysRunning(firstSeen: string | null, lastSeen: string | null): number {
    if (!firstSeen) return 0;

    const first = new Date(firstSeen);
    const last = lastSeen ? new Date(lastSeen) : new Date();

    const diffMs = last.getTime() - first.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Detect scaling signals from ad data
   */
  private detectScalingSignals(ad: Ad, daysRunning: number): ScalingSignal[] {
    const signals: ScalingSignal[] = [];

    // Signal 1: Long run time (14+ days)
    signals.push({
      signal: 'long_run_time',
      detected: daysRunning >= 14,
      weight: 0.3,
      reason: daysRunning >= 14
        ? `Running for ${daysRunning} days indicates profitability`
        : `Only ${daysRunning} days - still in testing phase`,
    });

    // Signal 2: Very long run time (30+ days)
    signals.push({
      signal: 'evergreen',
      detected: daysRunning >= 30,
      weight: 0.2,
      reason: daysRunning >= 30
        ? `${daysRunning} days - established evergreen ad`
        : 'Not yet evergreen status',
    });

    // Signal 3: High engagement (if available)
    const hasHighEngagement = Boolean(
      (ad.likes && ad.likes > 1000) ||
      (ad.comments && ad.comments > 100) ||
      (ad.shares && ad.shares > 50)
    );
    signals.push({
      signal: 'high_engagement',
      detected: hasHighEngagement,
      weight: 0.15,
      reason: hasHighEngagement
        ? `High engagement: ${ad.likes || 0} likes, ${ad.comments || 0} comments`
        : 'Limited engagement data',
    });

    // Signal 4: Multiple platforms (if we can detect)
    // This would require additional data

    // Signal 5: High impression range (for Meta ads)
    const hasHighImpressions =
      ad.impressionsMax && ad.impressionsMax > 100000;
    signals.push({
      signal: 'high_impressions',
      detected: !!hasHighImpressions,
      weight: 0.2,
      reason: hasHighImpressions
        ? `High impressions: up to ${ad.impressionsMax?.toLocaleString()}`
        : ad.impressionsMax
          ? `Moderate impressions: ${ad.impressionsMax.toLocaleString()}`
          : 'No impression data available',
    });

    // Signal 6: Professional production (if analysis available)
    let isProfessional = false;
    if (ad.analysis) {
      try {
        const analysis = JSON.parse(ad.analysis);
        isProfessional =
          analysis.production?.budget_estimate === 'high_produced' ||
          analysis.production?.style === 'professional';
      } catch {
        // Ignore parse errors
      }
    }
    signals.push({
      signal: 'professional_production',
      detected: isProfessional,
      weight: 0.15,
      reason: isProfessional
        ? 'Professional production quality suggests larger budget'
        : 'Standard or UGC production',
    });

    return signals;
  }

  /**
   * Calculate scaling score from signals
   */
  private calculateScalingScore(signals: ScalingSignal[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const signal of signals) {
      totalWeight += signal.weight;
      if (signal.detected) {
        weightedSum += signal.weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine ad phase based on signals
   */
  private determineAdPhase(
    daysRunning: number,
    scalingScore: number
  ): 'testing' | 'scaling' | 'mature' {
    if (daysRunning >= 30 && scalingScore >= 0.5) {
      return 'mature';
    }
    if (daysRunning >= 7 && scalingScore >= 0.3) {
      return 'scaling';
    }
    return 'testing';
  }

  /**
   * Detect niche from ad content
   */
  private detectNiche(ad: Ad): string {
    // Try to get from analysis first
    if (ad.analysis) {
      try {
        const analysis = JSON.parse(ad.analysis);
        if (analysis.niche) {
          const niche = analysis.niche.toLowerCase();
          if (CPM_BENCHMARKS[niche]) {
            return niche;
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Try to infer from text content
    const text = [ad.headline, ad.bodyText, ad.ctaText]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (text.includes('dropship') || text.includes('ecom') || text.includes('store')) {
      return 'ecommerce';
    }
    if (text.includes('crypto') || text.includes('bitcoin') || text.includes('trading')) {
      return 'crypto';
    }
    if (text.includes('saas') || text.includes('software') || text.includes('app')) {
      return 'saas';
    }
    if (text.includes('money') || text.includes('income') || text.includes('profit')) {
      return 'mmo';
    }
    if (text.includes('health') || text.includes('supplement') || text.includes('weight')) {
      return 'health';
    }
    if (text.includes('fitness') || text.includes('workout') || text.includes('gym')) {
      return 'fitness';
    }
    if (text.includes('beauty') || text.includes('skin') || text.includes('cosmetic')) {
      return 'beauty';
    }

    return 'other';
  }

  /**
   * Estimate spend for an ad
   */
  estimateSpend(ad: Ad, overrideNiche?: string): SpendEstimateResult {
    const daysRunning = this.calculateDaysRunning(ad.firstSeenAt, ad.lastSeenAt);
    const scalingSignals = this.detectScalingSignals(ad, daysRunning);
    const scalingScore = this.calculateScalingScore(scalingSignals);
    const isScaling = scalingScore >= 0.4;

    const niche = overrideNiche || this.detectNiche(ad);
    const cpm = CPM_BENCHMARKS[niche] || CPM_BENCHMARKS.other;

    const phase = this.determineAdPhase(daysRunning, scalingScore);
    const impressions = DAILY_IMPRESSIONS[phase];

    // Calculate daily spend range
    const dailySpendMin = (impressions.min / 1000) * cpm.low;
    const dailySpendMax = (impressions.max / 1000) * cpm.high;

    // Calculate total spend range
    const totalSpendMin = dailySpendMin * daysRunning;
    const totalSpendMax = dailySpendMax * daysRunning;

    // Determine confidence
    const confidenceReasons: string[] = [];
    let confidence: 'low' | 'medium' | 'high' = 'medium';

    if (daysRunning < 3) {
      confidence = 'low';
      confidenceReasons.push('Very short run time - limited data');
    } else if (daysRunning >= 14) {
      confidence = 'high';
      confidenceReasons.push('Long run time provides reliable signal');
    }

    if (ad.impressionsMin && ad.impressionsMax) {
      confidence = confidence === 'low' ? 'medium' : 'high';
      confidenceReasons.push('Impression data available from platform');
    } else {
      confidenceReasons.push('No impression data - using estimates');
    }

    if (scalingScore >= 0.5) {
      confidenceReasons.push(`Strong scaling signals (${Math.round(scalingScore * 100)}% score)`);
    }

    return {
      daysRunning,
      firstSeen: ad.firstSeenAt || new Date().toISOString(),
      lastSeen: ad.lastSeenAt || new Date().toISOString(),
      dailySpend: { min: Math.round(dailySpendMin), max: Math.round(dailySpendMax) },
      totalSpend: { min: Math.round(totalSpendMin), max: Math.round(totalSpendMax) },
      isScaling,
      scalingSignals,
      scalingScore,
      niche,
      cpmUsed: cpm,
      confidence,
      confidenceReasons,
    };
  }

  /**
   * Convert result to database record
   */
  toDbRecord(adId: string, result: SpendEstimateResult): NewSpendEstimate {
    return {
      id: nanoid(),
      adId,
      daysRunning: result.daysRunning,
      firstSeen: result.firstSeen,
      lastSeen: result.lastSeen,
      estimatedDailySpendMin: result.dailySpend.min.toString(),
      estimatedDailySpendMax: result.dailySpend.max.toString(),
      estimatedTotalSpendMin: result.totalSpend.min.toString(),
      estimatedTotalSpendMax: result.totalSpend.max.toString(),
      variantCount: null, // Would need additional data
      isScaling: result.isScaling,
      scalingSignals: JSON.stringify(result.scalingSignals),
      cpmBenchmarkUsed: JSON.stringify(result.cpmUsed),
      niche: result.niche,
      confidence: result.confidence,
      estimatedAt: new Date().toISOString(),
    };
  }
}

// Singleton
let estimatorInstance: SpendEstimator | null = null;

export function getSpendEstimator(): SpendEstimator {
  if (!estimatorInstance) {
    estimatorInstance = new SpendEstimator();
  }
  return estimatorInstance;
}
