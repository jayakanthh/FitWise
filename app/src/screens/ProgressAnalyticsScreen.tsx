import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
  TrendingDown,
  Lightbulb,
  Calendar,
  History,
  ChevronRight,
  Plus,
  Scale,
  Activity,
  HeartPulse,
  AlertCircle,
  Ruler,
  Award,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme/colors';
import { Typography } from '../components/ui/Typography';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { initialUserProfile } from '../data/mockData';

// ─── Mock Weight History ────────────────────────────────────────────────────
const WEIGHT_HISTORY = [
  { id: 'w-1', date: '2026-07-01', displayDate: 'Jul 1', weight: 105.2, targetWeight: 100.0 },
  { id: 'w-2', date: '2026-07-05', displayDate: 'Jul 5', weight: 104.9, targetWeight: 100.0 },
  { id: 'w-3', date: '2026-07-09', displayDate: 'Jul 9', weight: 104.5, targetWeight: 100.0 },
  { id: 'w-4', date: '2026-07-15', displayDate: 'Jul 15', weight: 103.8, targetWeight: 100.0 },
  { id: 'w-5', date: '2026-07-20', displayDate: 'Jul 20', weight: 103.6, targetWeight: 100.0 },
  { id: 'w-6', date: '2026-07-28', displayDate: 'Jul 28', weight: 103.4, targetWeight: 100.0 },
];

const MUSCLE_VOLUME = [
  { muscleGroup: 'Chest', weeklySets: 18, optimalRange: '12-20 sets', status: 'optimal' },
  { muscleGroup: 'Back', weeklySets: 20, optimalRange: '14-22 sets', status: 'optimal' },
  { muscleGroup: 'Quadriceps', weeklySets: 16, optimalRange: '12-18 sets', status: 'optimal' },
  { muscleGroup: 'Hamstrings', weeklySets: 12, optimalRange: '10-16 sets', status: 'optimal' },
  { muscleGroup: 'Shoulders', weeklySets: 14, optimalRange: '12-18 sets', status: 'optimal' },
  { muscleGroup: 'Biceps & Triceps', weeklySets: 16, optimalRange: '10-16 sets', status: 'optimal' },
];

const PLATEAU_STATUS = {
  isPlateaued: false,
  advice: 'Your metabolic pacing is optimal. Consistent 400 kcal deficit maintained with progressive overload.',
  recommendedActions: [
    'Maintain current 2,400 kcal nutrition plan',
    'Increase progressive overload on primary compound movements',
    'Ensure 7.5+ hours of sleep nightly for CNS recovery',
  ],
};

const RECOVERY_STATUS = {
  score: 88,
  label: 'Prime Readiness',
  sleepHours: 7.8,
  hrvMs: 68,
  sorenessLevel: 'Low',
  recommendation: 'Your nervous system and muscle fibers are fully recovered. High-intensity PR attempts recommended today!',
};

// ─── BODY MEASUREMENTS mock ─────────────────────────────────────────────────
const BODY_MEASUREMENTS = [
  { zone: 'Waist', current: 88, change: -1.5, unit: 'cm' },
  { zone: 'Chest', current: 104, change: +0.5, unit: 'cm' },
  { zone: 'Hips', current: 102, change: -0.8, unit: 'cm' },
  { zone: 'Biceps (L)', current: 36, change: +0.3, unit: 'cm' },
  { zone: 'Biceps (R)', current: 36.5, change: +0.4, unit: 'cm' },
  { zone: 'Neck', current: 40, change: -0.2, unit: 'cm' },
  { zone: 'Thighs (L)', current: 60, change: -0.6, unit: 'cm' },
  { zone: 'Glutes', current: 102, change: -1.0, unit: 'cm' },
];

// ─── Chart Constants ─────────────────────────────────────────────────────────
const CHART_W = 300;
const CHART_H = 140;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 24;

const MIN_W = 99.5;
const MAX_W = 106.5;

const getX = (i: number, total: number) =>
  PAD_L + (i / (total - 1)) * (CHART_W - PAD_L - PAD_R);

const getY = (w: number) =>
  PAD_T + ((MAX_W - w) / (MAX_W - MIN_W)) * (CHART_H - PAD_T - PAD_B);

type Tab = 'Weight' | 'Volume' | 'Measurements';

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function ProgressAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const user = initialUserProfile;

  const [activeTab, setActiveTab] = useState<Tab>('Weight');
  const [activeTimeframe, setActiveTimeframe] = useState<'1W' | '1M' | '3M' | 'ALL'>('1M');
  const [showLogModal, setShowLogModal] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState(user.currentWeight.toString());
  const [weightHistory, setWeightHistory] = useState(WEIGHT_HISTORY);
  const [selectedPoint, setSelectedPoint] = useState<typeof WEIGHT_HISTORY[0] | null>(null);

  // Build SVG paths
  const points = weightHistory.map((pt, i) => ({
    ...pt,
    x: getX(i, weightHistory.length),
    y: getY(pt.weight),
  }));

  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${prev.y}, ${cx1} ${cy2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${CHART_H - PAD_B} L ${points[0].x} ${CHART_H - PAD_B} Z`
    : '';

  const targetY = getY(100.0);
  const lastPt = points[points.length - 1];

  const handleSaveWeight = () => {
    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val < 30 || val > 300) {
      return Alert.alert('Invalid weight', 'Enter a weight between 30 and 300 kg.');
    }
    const today = new Date();
    const displayDate = today.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const isoDate = today.toISOString().split('T')[0];
    setWeightHistory((prev) => [
      ...prev,
      { id: `w-${prev.length + 1}`, date: isoDate, displayDate, weight: val, targetWeight: 100.0 },
    ]);
    setShowLogModal(false);
  };

  const TABS: Tab[] = ['Weight', 'Volume', 'Measurements'];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Typography variant="h2">Progress & Analytics</Typography>
          <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
            Body Composition • Recovery • Volume
          </Typography>
        </View>
        <TouchableOpacity style={styles.logWeightBtn} onPress={() => setShowLogModal(true)}>
          <Plus size={16} color={colors.primary} />
          <Typography variant="caption" color={colors.primary} style={{ fontSize: 10 }}>Log Weight</Typography>
        </TouchableOpacity>
      </View>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Typography
              variant="caption"
              color={activeTab === tab ? colors.primary : colors.textMuted}
              style={{ fontSize: 12 }}
            >
              {tab === 'Measurements' ? '📏 Measurements' : tab}
            </Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── WEIGHT TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'Weight' && (
          <>
            {/* Main Weight Chart Card */}
            <Card style={styles.chartCard}>
              {/* Top: metric + timeframe selector */}
              <View style={styles.chartTopRow}>
                <View>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9 }}>CURRENT WEIGHT</Typography>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Typography variant="h1" style={{ fontSize: 30 }}>{user.currentWeight}</Typography>
                    <Typography variant="h2" style={{ fontSize: 18 }}>kg</Typography>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <TrendingDown size={13} color={colors.primary} />
                    <Typography variant="caption" color={colors.primary} style={{ fontSize: 11 }}>
                      {Math.abs(user.weightChangeThisWeek)} kg this week
                    </Typography>
                  </View>
                </View>

                <View style={styles.timeframePills}>
                  {(['1W', '1M', '3M', 'ALL'] as const).map((tf) => (
                    <TouchableOpacity
                      key={tf}
                      style={[styles.tfPill, activeTimeframe === tf && styles.tfPillActive]}
                      onPress={() => setActiveTimeframe(tf)}
                    >
                      <Typography variant="caption" color={activeTimeframe === tf ? colors.primary : colors.textMuted} style={{ fontSize: 10 }}>
                        {tf}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SVG Weight Chart: Expected vs Actual */}
              <View style={styles.svgWrapper}>
                {selectedPoint && (
                  <View style={styles.tooltip}>
                    <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>{selectedPoint.displayDate}: </Typography>
                    <Typography variant="caption" color={colors.primary} style={{ fontSize: 10, fontWeight: '800' }}>{selectedPoint.weight} kg</Typography>
                  </View>
                )}

                <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
                  <Defs>
                    <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.28} />
                      <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                    </SvgGradient>
                  </Defs>

                  {/* Y-axis labels */}
                  <SvgText x={4} y={getY(105) + 4} fontSize={8} fill="#555f6b">105</SvgText>
                  <SvgText x={4} y={getY(102.5) + 4} fontSize={8} fill="#555f6b">102.5</SvgText>
                  <SvgText x={4} y={getY(100) + 4} fontSize={8} fill="#555f6b">100</SvgText>

                  {/* Target dashed line */}
                  <Line
                    x1={PAD_L} y1={targetY}
                    x2={CHART_W - PAD_R} y2={targetY}
                    stroke="#3e4e58" strokeWidth={1.5} strokeDasharray="4 3"
                  />
                  <SvgText x={CHART_W - PAD_R + 2} y={targetY + 4} fontSize={7} fill="#6b7d88" fontWeight="bold">TARGET</SvgText>

                  {/* Area fill */}
                  {areaD ? <Path d={areaD} fill="url(#areaGrad)" /> : null}

                  {/* Actual weight curve */}
                  {pathD ? <Path d={pathD} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" /> : null}

                  {/* Data points */}
                  {points.map((pt, i) => (
                    <Circle
                      key={pt.id}
                      cx={pt.x} cy={pt.y} r={i === points.length - 1 ? 5 : 3.5}
                      fill={colors.primary}
                      stroke={i === points.length - 1 ? colors.bg : 'none'}
                      strokeWidth={2}
                      onPress={() => setSelectedPoint(pt === selectedPoint ? null : pt)}
                    />
                  ))}

                  {/* ACTUAL label at last point */}
                  {lastPt && (
                    <SvgText x={lastPt.x} y={lastPt.y - 10} textAnchor="middle" fontSize={8} fill={colors.primary} fontWeight="bold">ACTUAL</SvgText>
                  )}

                  {/* X-axis dates */}
                  <SvgText x={getX(0, points.length)} y={CHART_H - 4} fontSize={9} fill="#8892a0">{points[0]?.displayDate}</SvgText>
                  <SvgText x={CHART_W / 2} y={CHART_H - 4} textAnchor="middle" fontSize={9} fill="#8892a0">
                    {points[Math.floor(points.length / 2)]?.displayDate}
                  </SvgText>
                  <SvgText x={CHART_W - PAD_R} y={CHART_H - 4} textAnchor="end" fontSize={9} fill="#8892a0">{points[points.length - 1]?.displayDate}</SvgText>
                </Svg>
              </View>

              {/* Insight pacing callout */}
              <View style={styles.insightBox}>
                <View style={styles.insightIconBox}>
                  <Lightbulb size={14} color={colors.primary} />
                </View>
                <Typography variant="body" style={{ flex: 1, fontSize: 12 }}>
                  You're{' '}
                  <Typography variant="body" color={colors.primary} style={{ fontWeight: '800', fontSize: 12 }}>
                    {user.weightPacingAhead} kg ahead{' '}
                  </Typography>
                  of your target pacing. Keep it up!
                </Typography>
              </View>
            </Card>

            {/* Active Goal Card */}
            <Card style={styles.goalCard}>
              <View style={{ flex: 1 }}>
                <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9 }}>ACTIVE GOAL</Typography>
                <Typography variant="h2" style={{ marginTop: 4 }}>Lose 3 kg in {user.goalDays} days</Typography>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Calendar size={13} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>Est. {user.goalTargetDate}</Typography>
                </View>
              </View>

              {/* Goal Ring */}
              <View style={styles.goalRingWrapper}>
                <Svg width={60} height={60} viewBox="0 0 36 36" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={colors.surfaceAlt} strokeWidth="3"
                  />
                  <Path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${user.goalProgressPercent}, 100`}
                  />
                </Svg>
                <View style={styles.goalRingText}>
                  <Typography variant="caption" color={colors.text} style={{ fontSize: 11, fontWeight: '900' }}>{user.goalProgressPercent}%</Typography>
                </View>
              </View>
            </Card>

            {/* Recovery Card */}
            <Card style={styles.recoveryCard}>
              <View style={styles.recoveryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <HeartPulse size={16} color="#34d399" />
                  <Typography variant="caption" style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Recovery & CNS Readiness
                  </Typography>
                </View>
                <View style={styles.recoveryBadge}>
                  <Typography variant="caption" color="#34d399" style={{ fontSize: 9, fontWeight: '800' }}>{RECOVERY_STATUS.label}</Typography>
                </View>
              </View>

              <View style={styles.recoveryScoreBox}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Typography style={{ fontSize: 36, fontWeight: '900', color: '#34d399' }}>{RECOVERY_STATUS.score}</Typography>
                  <Typography variant="caption" color={colors.textMuted}> / 100</Typography>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>Sleep: {RECOVERY_STATUS.sleepHours} hrs</Typography>
                  <Typography variant="caption" color="#06b6d4" style={{ fontSize: 11, fontFamily: 'monospace' }}>HRV: {RECOVERY_STATUS.hrvMs} ms</Typography>
                </View>
              </View>

              <Typography variant="body" color={colors.textMuted} style={{ fontSize: 12, lineHeight: 18 }}>
                {RECOVERY_STATUS.recommendation}
              </Typography>
            </Card>

            {/* Plateau Detection Card */}
            <Card style={styles.plateauCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} color="#f59e0b" />
                <Typography variant="caption" style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Metabolic & Strength Plateau Analysis
                </Typography>
              </View>

              <View style={styles.plateauStatusBox}>
                <Typography variant="bodyBold" style={{ marginBottom: 4 }}>✅ Status: No Stagnation Detected</Typography>
                <Typography variant="body" color={colors.textMuted} style={{ fontSize: 12, lineHeight: 18 }}>
                  {PLATEAU_STATUS.advice}
                </Typography>
              </View>

              <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                ACTION PLAN:
              </Typography>
              {PLATEAU_STATUS.recommendedActions.map((action, i) => (
                <View key={i} style={styles.actionItem}>
                  <Typography color={colors.primary} style={{ fontSize: 14 }}>•</Typography>
                  <Typography variant="body" style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>{action}</Typography>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* ── VOLUME TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'Volume' && (
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="#06b6d4" />
                <Typography variant="caption" style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Weekly Muscle Volume Heatmap
                </Typography>
              </View>
              <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>98 Sets Total</Typography>
            </View>

            {MUSCLE_VOLUME.map((mv, idx) => {
              const fillPct = Math.min(100, (mv.weeklySets / 22) * 100);
              const barColor = fillPct > 85 ? '#f59e0b' : fillPct > 60 ? '#06b6d4' : '#34d399';
              return (
                <View key={idx} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="bodyBold" style={{ fontSize: 12 }}>{mv.muscleGroup}</Typography>
                    <Typography variant="caption" style={{ fontSize: 11 }}>
                      <Typography variant="caption" color={barColor} style={{ fontWeight: '800', fontSize: 11 }}>{mv.weeklySets} sets </Typography>
                      <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>({mv.optimalRange})</Typography>
                    </Typography>
                  </View>
                  <View style={styles.volumeTrack}>
                    <View style={[styles.volumeFill, { width: `${fillPct}%` as any, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* ── MEASUREMENTS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'Measurements' && (
          <>
            <View style={styles.measurementsHeader}>
              <View style={styles.measurementIconBox}>
                <Ruler size={18} color="#06b6d4" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Typography variant="h2" style={{ fontSize: 15 }}>Body Circumference Tracking</Typography>
                  <View style={styles.trendBadge}>
                    <Typography style={{ color: '#7dd3fc', fontSize: 8, fontWeight: '900' }}>TREND GRAPH</Typography>
                  </View>
                </View>
                <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                  Hip, Biceps, Triceps, Neck, Glutes & Waist logs
                </Typography>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {BODY_MEASUREMENTS.map((m) => {
                const isDown = m.change < 0;
                const changeColor = isDown ? colors.primary : '#f87171';
                return (
                  <Card key={m.zone} style={styles.measurementCard}>
                    <View style={styles.measurementCardLeft}>
                      <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {m.zone}
                      </Typography>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Typography style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{m.current}</Typography>
                        <Typography variant="caption" color={colors.textMuted}>{m.unit}</Typography>
                      </View>
                    </View>
                    <View style={[styles.changeBadge, { backgroundColor: isDown ? 'rgba(72,187,149,0.1)' : 'rgba(248,113,113,0.1)', borderColor: isDown ? 'rgba(72,187,149,0.3)' : 'rgba(248,113,113,0.3)' }]}>
                      <Typography style={{ color: changeColor, fontSize: 11, fontWeight: '800' }}>
                        {isDown ? '↓' : '↑'} {Math.abs(m.change)} {m.unit}
                      </Typography>
                      <Typography style={{ color: changeColor, fontSize: 9 }}>this month</Typography>
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* ── Log to Detailed History Button ─────────────────────────────── */}
        <TouchableOpacity style={styles.detailedLogBtn} onPress={() => {}}>
          <View style={styles.detailedLogLeft}>
            <View style={styles.detailedLogIcon}>
              <History size={18} color={colors.primary} />
            </View>
            <Typography variant="bodyBold">View Detailed Weight Log</Typography>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

      </ScrollView>

      {/* ── Log Weight Modal ──────────────────────────────────────────────── */}
      <Modal visible={showLogModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.logModal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Scale size={20} color={colors.primary} />
              <Typography variant="h2" style={{ fontSize: 16 }}>Log Today's Weight</Typography>
            </View>

            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11, marginBottom: 6 }}>Weight (kg)</Typography>
            <TextInput
              style={styles.weightInput}
              keyboardType="decimal-pad"
              value={newWeightInput}
              onChangeText={setNewWeightInput}
              placeholder="e.g. 103.2"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLogModal(false)}>
                <Typography variant="body" color={colors.textMuted}>Cancel</Typography>
              </TouchableOpacity>
              <Button variant="primary" label="Save" style={{ flex: 1 }} onPress={handleSaveWeight} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logWeightBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(72,187,149,0.1)', borderColor: 'rgba(72,187,149,0.3)',
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
  },

  tabScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabPill: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surfaceAlt,
  },
  tabPillActive: {
    backgroundColor: 'rgba(72,187,149,0.1)', borderColor: colors.primary,
  },

  content: { padding: 16, gap: 16, paddingBottom: 100 },

  // Chart Card
  chartCard: { gap: 14 },
  chartTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  timeframePills: {
    flexDirection: 'row', backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md, padding: 4, gap: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  tfPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md },
  tfPillActive: { backgroundColor: 'rgba(72,187,149,0.15)' },

  svgWrapper: { position: 'relative' },
  tooltip: {
    position: 'absolute', top: 0, left: '50%',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1f262b', borderWidth: 1,
    borderColor: 'rgba(72,187,149,0.4)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md,
    zIndex: 10,
  },

  insightBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#15231e', borderWidth: 1, borderColor: '#214337',
    borderRadius: radius.md, padding: 10,
  },
  insightIconBox: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1b382d', alignItems: 'center', justifyContent: 'center',
  },

  // Goal Card
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  goalRingWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  goalRingText: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },

  // Recovery Card
  recoveryCard: { gap: 12 },
  recoveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recoveryBadge: {
    backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)',
  },
  recoveryScoreBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },

  // Plateau Card
  plateauCard: { gap: 10 },
  plateauStatusBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: 10, borderWidth: 1, borderColor: colors.border,
  },
  actionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },

  // Volume
  volumeTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 4 },

  // Measurements
  measurementsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(6,182,212,0.08)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)',
    borderRadius: radius.lg, padding: 14,
  },
  measurementIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(6,182,212,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  trendBadge: {
    backgroundColor: 'rgba(6,182,212,0.15)', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  measurementCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  measurementCardLeft: { gap: 2 },
  changeBadge: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1,
  },

  // Detailed Log Button
  detailedLogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14,
  },
  detailedLogLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailedLogIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },

  // Log Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end', padding: 16,
  },
  logModal: {
    backgroundColor: '#171b1f', borderRadius: radius.xl,
    padding: 20, borderWidth: 1, borderColor: '#28323a',
    marginBottom: 16,
  },
  weightInput: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 20, fontWeight: '800',
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.pill,
    paddingVertical: 12,
  },
});
