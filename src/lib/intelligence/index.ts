// Ad Intelligence Module
// Provides AI-powered competitor analysis, spend estimation, and winner detection

export {
  AudienceInferenceEngine,
  getAudienceInferenceEngine,
  type AudienceInferenceResult,
} from './audience-inference';

export {
  SpendEstimator,
  getSpendEstimator,
  type SpendEstimateResult,
  type ScalingSignal,
} from './spend-estimator';

export {
  WinnerDetector,
  getWinnerDetector,
  type WinnerEvaluationResult,
  type WinnerCriteria,
} from './winner-detector';

export {
  HistoricalTracker,
  getHistoricalTracker,
  type SnapshotResult,
  type AdHistoryStats,
} from './historical-tracker';

export {
  CompetitorTracker,
  getCompetitorTracker,
  type CompetitorSummary,
  type CompetitorAlert,
} from './competitor-tracker';
