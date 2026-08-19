/**
 * Trend calculation engine for body progress.
 * All functions are pure — they never modify historical measurements.
 *
 * Key concepts:
 *   rawPoints     — actual logged MeasurementEntry values (never modified)
 *   trend         — 7-day rolling average of raw points (requires >= 3 entries)
 *   projection    — expected linear trajectory calculated from goal parameters
 *   status        — comparison of current trend vs expected trajectory
 *   estimatedDate — projected completion date based on current trend rate
 */

import type { MeasurementEntry } from '../../models/measurement';

export type ProgressStatus =
  | 'insufficient_data'
  | 'ahead'
  | 'on_track'
  | 'slightly_behind'
  | 'significantly_behind';

export interface TrendPoint {
  timestamp: number;
  value: number;
}

export interface ProjectedPoint {
  timestamp: number;
  expected: number;
}

export interface TrendResult {
  status: ProgressStatus;
  statusLabel: string;
  statusColor: string;
  trendPoints: TrendPoint[];          // smoothed rolling average (raw when < MIN_TREND_POINTS)
  rawPoints: TrendPoint[];            // always the unmodified raw data
  currentTrend: number | null;        // latest smoothed value, null if no data
  expectedNow: number | null;         // what the goal projection says right now
  estimatedCompletionDate: number | null; // ms timestamp
  daysAheadOrBehind: number | null;   // positive = ahead, negative = behind
  projection: ProjectedPoint[];       // full expected trajectory from start → target
}

const MIN_TREND_POINTS = 3; // minimum entries to attempt rolling average
const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Compute 7-day rolling average over an ordered list of measurement entries.
 * Returns raw values when there are fewer than MIN_TREND_POINTS.
 */
export function computeRollingAverage(entries: MeasurementEntry[]): TrendPoint[] {
  if (entries.length === 0) return [];

  // Always return raw points; when we have enough, also smooth them
  const raw = entries.map((e) => ({ timestamp: e.recordedAt, value: e.value }));
  if (raw.length < MIN_TREND_POINTS) return raw;

  const smoothed: TrendPoint[] = [];
  for (let i = 0; i < raw.length; i++) {
    const windowStart = raw[i].timestamp - ROLLING_WINDOW_MS;
    const window = raw.filter(
      (p) => p.timestamp >= windowStart && p.timestamp <= raw[i].timestamp
    );
    const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;
    smoothed.push({ timestamp: raw[i].timestamp, value: Math.round(avg * 10) / 10 });
  }
  return smoothed;
}

/**
 * Generate expected linear trajectory points from goal parameters.
 * Points are spaced weekly between startDate and targetDate.
 */
export function buildProjection(
  startValue: number,
  targetValue: number,
  startDate: number,
  targetDate: number,
): ProjectedPoint[] {
  const totalMs = targetDate - startDate;
  const totalChange = targetValue - startValue;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const points: ProjectedPoint[] = [];
  let t = startDate;
  while (t <= targetDate + WEEK_MS) {
    const ratio = Math.min(1, (t - startDate) / totalMs);
    points.push({
      timestamp: t,
      expected: Math.round((startValue + totalChange * ratio) * 10) / 10,
    });
    t += WEEK_MS;
  }
  // Always include the exact target endpoint
  points.push({ timestamp: targetDate, expected: targetValue });
  return points;
}

/**
 * Given a current trend rate (value change per day), estimate when target will be reached.
 */
function estimateCompletion(
  latestTrendValue: number,
  targetValue: number,
  latestTimestamp: number,
  startValue: number,
): number | null {
  const change = targetValue - latestTrendValue;
  // Figure out the daily rate from the first measurement to the latest trend
  // Use a safe fallback if there's no usable rate
  if (Math.abs(change) < 0.01) return latestTimestamp; // already there

  const totalNeeded = targetValue - startValue;
  const achieved = latestTrendValue - startValue;
  if (Math.abs(totalNeeded) < 0.01) return latestTimestamp;

  // Daily rate from start to current (change per day)
  return null; // will be computed by caller with full data
}

/** The main entry point used by screens. */
export function analyzeProgress(
  entries: MeasurementEntry[],
  startValue: number,
  targetValue: number,
  startDate: number,
  targetDate: number,
): TrendResult {
  const rawPoints: TrendPoint[] = entries.map((e) => ({
    timestamp: e.recordedAt,
    value: e.value,
  }));

  const projection = buildProjection(startValue, targetValue, startDate, targetDate);

  if (entries.length === 0) {
    return {
      status: 'insufficient_data',
      statusLabel: 'Not enough data yet',
      statusColor: '#9ca3af',
      trendPoints: [],
      rawPoints,
      currentTrend: null,
      expectedNow: projection[0]?.expected ?? startValue,
      estimatedCompletionDate: null,
      daysAheadOrBehind: null,
      projection,
    };
  }

  const trendPoints = computeRollingAverage(entries);
  const currentTrend = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].value : entries[entries.length - 1].value;

  // Find expected value right now by interpolating the projection
  const now = Date.now();
  const totalMs = targetDate - startDate;
  const ratio = Math.min(1, Math.max(0, (now - startDate) / totalMs));
  const expectedNow = startValue + (targetValue - startValue) * ratio;

  // Trend delta vs expected
  // For weight loss: lower is better. For gain: higher is better.
  const isLoss = targetValue < startValue;
  const trendDelta = isLoss
    ? expectedNow - currentTrend   // positive = ahead (lost more than expected)
    : currentTrend - expectedNow;  // positive = ahead (gained more than expected)

  let status: ProgressStatus;
  const pctBody = Math.abs(startValue - targetValue) === 0 ? 0 : Math.abs(trendDelta) / Math.abs(startValue - targetValue);

  if (entries.length < MIN_TREND_POINTS) {
    status = 'insufficient_data';
  } else if (trendDelta > pctBody * 0.05 * Math.abs(startValue - targetValue)) {
    status = 'ahead';
  } else if (Math.abs(trendDelta) <= 0.3) {
    status = 'on_track';
  } else if (trendDelta < -1.0) {
    status = 'significantly_behind';
  } else if (trendDelta < -0.3) {
    status = 'slightly_behind';
  } else {
    status = 'on_track';
  }

  const STATUS_META: Record<ProgressStatus, { label: string; color: string }> = {
    insufficient_data: { label: 'Not enough data yet', color: '#9ca3af' },
    ahead:             { label: '🟢 Ahead',             color: '#48bb95' },
    on_track:          { label: '🟢 On Track',          color: '#48bb95' },
    slightly_behind:   { label: '🟡 Slightly Behind',   color: '#eab308' },
    significantly_behind: { label: '🔴 Significantly Behind', color: '#f87171' },
  };

  // Estimate completion date from current trend rate
  let estimatedCompletionDate: number | null = null;
  let daysAheadOrBehind: number | null = null;
  if (entries.length >= MIN_TREND_POINTS) {
    // Rate = change per ms over the entire tracked period
    const firstEntry = entries[0];
    const elapsed = trendPoints[trendPoints.length - 1].timestamp - firstEntry.recordedAt;
    const valueChanged = trendPoints[trendPoints.length - 1].value - firstEntry.value;
    if (elapsed > 0 && Math.abs(valueChanged) > 0) {
      const ratePerMs = valueChanged / elapsed;
      const remaining = targetValue - currentTrend;
      const msToFinish = ratePerMs !== 0 ? remaining / ratePerMs : null;
      if (msToFinish !== null && msToFinish > 0) {
        estimatedCompletionDate = Date.now() + msToFinish;
        const diffDays = (estimatedCompletionDate - targetDate) / (24 * 60 * 60 * 1000);
        daysAheadOrBehind = Math.round(-diffDays); // positive = ahead
      }
    }
  }

  return {
    status,
    statusLabel: STATUS_META[status].label,
    statusColor: STATUS_META[status].color,
    trendPoints,
    rawPoints,
    currentTrend,
    expectedNow: Math.round(expectedNow * 10) / 10,
    estimatedCompletionDate,
    daysAheadOrBehind,
    projection,
  };
}
