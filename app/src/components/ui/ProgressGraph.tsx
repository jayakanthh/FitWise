/**
 * ProgressGraph — production SVG chart for Actual vs Expected vs Target.
 *
 * Three concepts rendered:
 *   ACTUAL    — solid line + filled dots for real logged measurements
 *   TREND     — lighter line for 7-day rolling average
 *   EXPECTED  — dashed line representing goal projection
 *   TARGET    — horizontal dashed marker at the target value
 *
 * Uses react-native-svg (already in package.json).
 * All colours come from the IronSync theme token system.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import Svg, {
  Line,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, spacing, radius } from '../../theme/colors';
import type { TrendPoint, ProjectedPoint } from '../../services/measurements/trend';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TimeRange = '1W' | '1M' | '3M' | '6M' | 'ALL';

interface ProgressGraphProps {
  rawPoints: TrendPoint[];       // actual user logs (never modified)
  trendPoints: TrendPoint[];     // smoothed rolling average
  projection: ProjectedPoint[];  // expected trajectory
  targetValue: number;
  height?: number;
  showTimeFilter?: boolean;
  timeRange?: TimeRange;
  onTimeRangeChange?: (r: TimeRange) => void;
  unit?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIME_FILTERS: TimeRange[] = ['1W', '1M', '3M', '6M', 'ALL'];

function filterByRange<T extends { timestamp: number }>(
  points: T[],
  range: TimeRange,
): T[] {
  if (range === 'ALL' || points.length === 0) return points;
  const now = Date.now();
  const msMap: Record<TimeRange, number> = {
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '3M': 90 * 24 * 60 * 60 * 1000,
    '6M': 180 * 24 * 60 * 60 * 1000,
    ALL: Infinity,
  };
  const cutoff = now - msMap[range];
  return points.filter((p) => p.timestamp >= cutoff);
}

function buildPathD(
  points: Array<{ x: number; y: number }>,
  smooth = false,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  if (!smooth) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }

  // Catmull-Rom → cubic bezier approximation for smooth curves
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const tension = 0.4;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ProgressGraph({
  rawPoints,
  trendPoints,
  projection,
  targetValue,
  height = 200,
  showTimeFilter = false,
  timeRange: externalRange,
  onTimeRangeChange,
  unit = 'kg',
}: ProgressGraphProps) {
  const [internalRange, setInternalRange] = useState<TimeRange>('ALL');
  const [svgWidth, setSvgWidth] = useState(300);

  const range = externalRange ?? internalRange;
  const handleRangeChange = (r: TimeRange) => {
    setInternalRange(r);
    onTimeRangeChange?.(r);
  };

  // Filter all data sets by range, but always include future projection
  const visibleRaw   = filterByRange(rawPoints, range);
  const visibleTrend = filterByRange(trendPoints, range);
  // Projection extends into future so keep it from startOfRange forward
  const visibleProj  = range === 'ALL' ? projection : (() => {
    const msMap: Record<TimeRange, number> = {
      '1W': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
      '3M': 90 * 24 * 60 * 60 * 1000,
      '6M': 180 * 24 * 60 * 60 * 1000,
      ALL: Infinity,
    };
    const cutoff = Date.now() - msMap[range];
    return projection.filter((p) => p.timestamp >= cutoff);
  })();

  // Combine all value ranges to determine Y scale
  const allValues = [
    ...visibleRaw.map((p) => p.value),
    ...visibleTrend.map((p) => p.value),
    ...visibleProj.map((p) => p.expected),
    targetValue,
  ].filter((v) => !isNaN(v));

  const allTimestamps = [
    ...visibleRaw.map((p) => p.timestamp),
    ...visibleTrend.map((p) => p.timestamp),
    ...visibleProj.map((p) => p.timestamp),
  ];

  const PAD = { top: 16, right: 16, bottom: 32, left: 44 };
  const W = svgWidth;
  const H = height;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const hasData = allValues.length > 0 && allTimestamps.length > 0;

  // Scales
  const minV = hasData ? Math.min(...allValues) : 0;
  const maxV = hasData ? Math.max(...allValues) : 100;
  const valueRange = maxV - minV || 1;
  const minT = hasData ? Math.min(...allTimestamps) : Date.now() - 1;
  const maxT = hasData ? Math.max(...allTimestamps, Date.now()) : Date.now();
  const timeRange_ = maxT - minT || 1;

  const toX = (ts: number) => PAD.left + ((ts - minT) / timeRange_) * chartW;
  // invert Y: higher value = lower y coordinate for weight loss goals, but we keep
  // a consistent SVG coordinate (top = high value visually)
  const toY = (v: number) => PAD.top + ((maxV - v) / valueRange) * chartH;

  // Convert point lists to screen coordinates
  const rawXY   = visibleRaw.map((p) => ({ x: toX(p.timestamp), y: toY(p.value) }));
  const trendXY  = visibleTrend.map((p) => ({ x: toX(p.timestamp), y: toY(p.value) }));
  const projXY   = visibleProj.map((p) => ({ x: toX(p.timestamp), y: toY(p.expected) }));
  const targetY  = toY(targetValue);

  // Dashed line helper — SVG strokeDasharray
  const DASH = '6 4';

  // Grid lines (subtle horizontal lines)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: PAD.top + ratio * chartH,
    label: (maxV - ratio * valueRange).toFixed(1),
  }));

  if (!hasData) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>Start logging to see your graph</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {showTimeFilter && (
        <View style={styles.filterRow}>
          {TIME_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => handleRangeChange(f)}
              style={[styles.filterBtn, range === f && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, range === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View
        onLayout={(e: LayoutChangeEvent) => setSvgWidth(e.nativeEvent.layout.width)}
        style={{ width: '100%' }}
      >
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.18" />
              <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Subtle grid lines */}
          {gridLines.map((gl, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PAD.left}
                y1={gl.y}
                x2={W - PAD.right}
                y2={gl.y}
                stroke={colors.border}
                strokeWidth={0.5}
                strokeDasharray="3 5"
              />
              <SvgText
                x={PAD.left - 4}
                y={gl.y + 4}
                fontSize={9}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {gl.label}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Target line */}
          <Line
            x1={PAD.left}
            y1={targetY}
            x2={W - PAD.right}
            y2={targetY}
            stroke={colors.milestone}
            strokeWidth={1}
            strokeDasharray={DASH}
            opacity={0.7}
          />
          <SvgText
            x={W - PAD.right + 2}
            y={targetY + 4}
            fontSize={9}
            fill={colors.milestone}
          >
            T
          </SvgText>

          {/* Expected/projection line */}
          {projXY.length > 1 && (
            <Path
              d={buildPathD(projXY)}
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray={DASH}
              fill="none"
              opacity={0.7}
            />
          )}

          {/* Trend (smoothed) line */}
          {trendXY.length > 1 && (
            <Path
              d={buildPathD(trendXY, true)}
              stroke={colors.primary}
              strokeWidth={1.5}
              fill="none"
              opacity={0.55}
            />
          )}

          {/* Actual line + area fill */}
          {rawXY.length > 1 && (
            <Path
              d={buildPathD(rawXY, true)}
              stroke={colors.primary}
              strokeWidth={2}
              fill="none"
            />
          )}

          {/* Actual data point dots */}
          {rawXY.map((pt, i) => (
            <Circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill={colors.bg}
              stroke={colors.primary}
              strokeWidth={2}
            />
          ))}

          {/* Latest value label */}
          {rawXY.length > 0 && (
            <SvgText
              x={rawXY[rawXY.length - 1].x}
              y={rawXY[rawXY.length - 1].y - 8}
              fontSize={9}
              fill={colors.primary}
              textAnchor="middle"
            >
              {visibleRaw[visibleRaw.length - 1].value} {unit}
            </SvgText>
          )}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>Actual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.primary, opacity: 0.55 }]} />
          <Text style={styles.legendLabel}>Trend</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#6b7280' }]} />
          <Text style={styles.legendLabel}>Expected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.milestone }]} />
          <Text style={styles.legendLabel}>Target</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.primaryDark,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
});
