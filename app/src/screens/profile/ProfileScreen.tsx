import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Settings, Share2, TrendingUp, Award, Dumbbell, Clock, History, ChevronRight, Camera, Target, Scale, Zap, Utensils } from 'lucide-react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors, spacing, radius } from '../../theme/colors';
import { useCurrentUser } from '../../context/CurrentUser';
import {
  currentUserId, signOutUser, getMeasurementHistory, getActiveGoal,
  getExercisesByIds, getWorkoutHistory, searchExercises, getPersonalRecords, getFoodLog
} from '../../services/index';
import { getAvatarBg } from '../../utils/formatting/avatarColors';
import {
  getUnitSystem,
  convertWeightToDisplay,
  getWeightUnit,
  convertCmToDisplay,
  getMeasurementUnit,
  convertWeightToCanonical,
  convertCmToCanonical
} from '../../utils/formatting/units';
import { logMeasurement } from '../../services/measurements/measurements';
import { todayISO } from '../../utils/formatting/dates';
import type { MeasurementEntry, MeasurementGoal, MeasurementType, Workout, Exercise, PersonalRecord } from '../../models/index';
import MuscleSilhouette, { aggregateMusclesFromExercises } from '../../components/common/MuscleSilhouette';

type MeTab = 'overview' | 'exercises' | 'measures' | 'photos';

const MEASUREMENT_TILES: { type: MeasurementType; label: string; unit: string }[] = [
  { type: 'weight', label: 'Body Weight', unit: 'kg' },
  { type: 'body_fat', label: 'Body Fat', unit: '%' },
  { type: 'waist', label: 'Waist', unit: 'cm' },
  { type: 'chest', label: 'Chest', unit: 'cm' },
  { type: 'bicep', label: 'Biceps', unit: 'cm' },
  { type: 'thigh', label: 'Thighs', unit: 'cm' },
  { type: 'hips', label: 'Hips', unit: 'cm' },
  { type: 'neck', label: 'Neck', unit: 'cm' },
  { type: 'forearm', label: 'Forearms', unit: 'cm' },
  { type: 'calf', label: 'Calves', unit: 'cm' },
];

const LOG_FIELDS: { type: MeasurementType; label: string; unit: string; placeholder: string }[] = [
  { type: 'weight', label: 'Weight', unit: 'kg', placeholder: 'e.g. 82.5' },
  { type: 'body_fat', label: 'Body Fat %', unit: '%', placeholder: 'e.g. 18' },
  { type: 'waist', label: 'Waist', unit: 'cm', placeholder: 'Optional' },
  { type: 'chest', label: 'Chest', unit: 'cm', placeholder: 'Optional' },
  { type: 'bicep', label: 'Bicep', unit: 'cm', placeholder: 'Optional' },
  { type: 'thigh', label: 'Thigh', unit: 'cm', placeholder: 'Optional' },
  { type: 'hips', label: 'Hips', unit: 'cm', placeholder: 'Optional' },
  { type: 'neck', label: 'Neck', unit: 'cm', placeholder: 'Optional' },
  { type: 'forearm', label: 'Forearm', unit: 'cm', placeholder: 'Optional' },
  { type: 'calf', label: 'Calf', unit: 'cm', placeholder: 'Optional' },
];

// Mini sparkline trend chart
function MiniTrendChart({ history }: { history: MeasurementEntry[] }) {
  if (history.length < 2) return null;
  const values = history.map(h => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  // Create 5 coordinate points mapped onto 60x22 SVG container
  const points = history
    .slice(-5) // show last 5 logs max
    .map((h, idx, arr) => {
      const x = arr.length > 1 ? (idx / (arr.length - 1)) * 60 : 30;
      const y = 20 - ((h.value - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.sparkline}>
      <Svg width={60} height={22}>
        <Polyline fill="none" stroke={colors.primary} strokeWidth={1.8} points={points} />
      </Svg>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile } = useCurrentUser();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const system = getUnitSystem(profile);
  const [activeTab, setActiveTab] = useState<MeTab>('overview');

  // Overview states
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [musclePrimary, setMusclePrimary] = useState<Set<string>>(new Set());
  const [muscleSecondary, setMuscleSecondary] = useState<Set<string>>(new Set());
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [errorOverview, setErrorOverview] = useState(false);

  // Measures states
  const [latestByType, setLatestByType] = useState<Record<string, MeasurementEntry | null>>({});
  const [historyByType, setHistoryByType] = useState<Record<string, MeasurementEntry[]>>({});
  const [activeGoal, setActiveGoal] = useState<MeasurementGoal | null>(null);
  const [loadingMeasures, setLoadingMeasures] = useState(false);
  const [errorMeasures, setErrorMeasures] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logValues, setLogValues] = useState<Record<string, string>>({});
  const [logSaving, setLogSaving] = useState(false);
  const [todayCalories, setTodayCalories] = useState<number | null>(null);

  // Exercises states
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseResults, setExerciseResults] = useState<Exercise[]>([]);
  const [loadingEx, setLoadingEx] = useState(false);
  const [prs, setPrs] = useState<Record<string, PersonalRecord>>({});
  const [prExercises, setPrExercises] = useState<Record<string, Exercise>>({});

  // Responsive dimension variables
  const windowWidth = Dimensions.get('window').width;
  const silhouetteSize = Math.floor((windowWidth - 48) / 2); // Perfectly fills horizontal gap on any device

  const loadOverviewData = useCallback(async () => {
    const uid = currentUserId();
    if (!uid) return;
    setLoadingOverview(true);
    setErrorOverview(false);
    try {
      const wkts = await getWorkoutHistory(uid, 20);
      setWorkouts(wkts);

      // Aggregate muscles trained this week (last 7 days)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentWkts = wkts.filter(w => w.createdAt >= weekAgo);
      const exIds = Array.from(new Set(recentWkts.flatMap(w => w.entries.map(e => e.exerciseId))));
      if (exIds.length > 0) {
        const exercises = await getExercisesByIds(exIds.slice(0, 20));
        const { primary, secondary } = aggregateMusclesFromExercises(exercises);
        setMusclePrimary(primary);
        setMuscleSecondary(secondary);
      } else {
        setMusclePrimary(new Set());
        setMuscleSecondary(new Set());
      }
    } catch (e) {
      console.error(e);
      setErrorOverview(true);
    }
    finally { setLoadingOverview(false); }
  }, []);

  const loadMeasuresData = useCallback(async () => {
    const uid = currentUserId();
    if (!uid) return;
    setLoadingMeasures(true);
    setErrorMeasures(false);
    try {
      const [goal, ...allData] = await Promise.all([
        getActiveGoal(uid),
        ...MEASUREMENT_TILES.map(t => getMeasurementHistory(uid, t.type)),
      ]);
      const byType: Record<string, MeasurementEntry | null> = {};
      const hist: Record<string, MeasurementEntry[]> = {};
      MEASUREMENT_TILES.forEach((t, i) => {
        const data = allData[i];
        byType[t.type] = data.length > 0 ? data[data.length - 1] : null;
        hist[t.type] = data;
      });
      setActiveGoal(goal);
      setLatestByType(byType);
      setHistoryByType(hist);

      // Grab today's caloric intake average
      const meals = await getFoodLog(uid, todayISO());
      if (meals && meals.length > 0) {
        setTodayCalories(meals.reduce((sum, item) => sum + (item.calories || 0), 0));
      } else {
        setTodayCalories(0);
      }
    } catch (e) {
      console.error(e);
      setErrorMeasures(true);
    }
    finally { setLoadingMeasures(false); }
  }, []);

  const loadPrData = useCallback(async () => {
    const uid = currentUserId();
    if (!uid) return;
    try {
      const prList = await getPersonalRecords(uid);
      const dict: Record<string, PersonalRecord> = {};
      prList.forEach(p => {
        dict[p.exerciseId] = p;
      });
      setPrs(dict);

      const exIds = prList.map(p => p.exerciseId);
      if (exIds.length > 0) {
        const exercises = await getExercisesByIds(exIds);
        const exDict: Record<string, Exercise> = {};
        exercises.forEach(e => { exDict[e.id] = e; });
        setPrExercises(exDict);
      }
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => {
    loadOverviewData();
    loadMeasuresData();
    loadPrData();
  }, [loadOverviewData, loadMeasuresData, loadPrData]));

  useEffect(() => {
    if (!exerciseSearch.trim()) { setExerciseResults([]); return; }
    const t = setTimeout(async () => {
      setLoadingEx(true);
      try {
        const results = await searchExercises(exerciseSearch.trim());
        setExerciseResults(results);
      } finally { setLoadingEx(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [exerciseSearch]);

  const handleLogMeasurements = async () => {
    const uid = currentUserId();
    if (!uid || logSaving) return;
    const hasValue = Object.values(logValues).some(v => v.trim());
    if (!hasValue) return Alert.alert('No data', 'Enter at least one measurement value.');
    setLogSaving(true);
    try {
      await Promise.all(
        LOG_FIELDS
          .filter(f => logValues[f.type]?.trim())
          .map(f => logMeasurement(uid, {
            userId: uid,
            type: f.type,
            value: parseFloat(logValues[f.type]),
            unit: f.unit,
            recordedAt: Date.now(),
          }))
      );
      setLogValues({});
      setShowLogModal(false);
      await loadMeasuresData();
      Alert.alert('Saved!', 'Measurements logged successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save measurements.');
    } finally { setLogSaving(false); }
  };

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initials = (profile.displayName || '?').slice(0, 2).toUpperCase();
  const avatarColor = getAvatarBg(profile.displayName || 'U');

  const latestWeight = latestByType['weight'];
  const weightChange = (() => {
    if (!latestWeight) return null;
    const val = convertWeightToDisplay(latestWeight.value, system);
    const unit = getWeightUnit(system);
    return `${val.toFixed(1)} ${unit}`;
  })();

  const totalVolumeThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return workouts
      .filter(w => w.createdAt >= weekAgo)
      .reduce((sum, w) => sum + (w.totalVolumeKg ?? 0), 0);
  }, [workouts]);

  const sessionsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return workouts.filter(w => w.createdAt >= weekAgo).length;
  }, [workouts]);

  // ── Renders ──────────────────────────────────────────────────────────────────

  const renderOverview = () => (
    <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
      {errorOverview ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load training overview.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOverviewData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Training Summary Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{sessionsThisWeek}</Text>
          <Text style={styles.statLbl}>Sessions This Week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{profile.currentStreak || 0}🔥</Text>
          <Text style={styles.statLbl}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{totalVolumeThisWeek > 0 ? Math.round(totalVolumeThisWeek / 1000) + 'k' : '—'}</Text>
          <Text style={styles.statLbl}>Vol (t) This Week</Text>
        </View>
      </View>

      {/* Muscle Activity Section */}
      <View style={styles.muscleContainerCard}>
        <Text style={styles.muscleSectionHeader}>THIS MONTH · MUSCLE ACTIVITY</Text>
        
        {loadingOverview ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.bodyVizRow}>
            <View style={[styles.bodyVizItem, { width: silhouetteSize }]}>
              <Text style={styles.bodyVizLabel}>ANTERIOR (FRONT)</Text>
              <MuscleSilhouette primaryMuscles={musclePrimary} secondaryMuscles={muscleSecondary} view="front" size={silhouetteSize - 16} />
            </View>
            <View style={[styles.bodyVizItem, { width: silhouetteSize }]}>
              <Text style={styles.bodyVizLabel}>POSTERIOR (BACK)</Text>
              <MuscleSilhouette primaryMuscles={musclePrimary} secondaryMuscles={muscleSecondary} view="back" size={silhouetteSize - 16} />
            </View>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Primary Focus</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#166e57' }]} />
            <Text style={styles.legendText}>Secondary Helpers</Text>
          </View>
        </View>
      </View>

      {/* Workout History Section */}
      <View style={styles.historySectionHeaderRow}>
        <Text style={styles.sectionLabel}>RECENT WORKOUTS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
          <Text style={styles.seeAllLink}>See All ({workouts.length})</Text>
        </TouchableOpacity>
      </View>

      {workouts.slice(0, 5).map(w => (
        <TouchableOpacity key={w.id} style={styles.workoutPremiumCard} activeOpacity={0.8} onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id, userId: profile?.id })}>
          <View style={styles.workoutCardTop}>
            <View style={styles.workoutTitleCol}>
              <Text style={styles.workoutName}>{w.planName || 'Custom Workout'}</Text>
              {w.workoutType === 'duo' && w.duoPartnerName && (
                <View style={styles.duoBadge}>
                  <Text style={styles.duoBadgeText}>🤝 Duo with {w.duoPartnerName}</Text>
                </View>
              )}
              <Text style={styles.workoutDate}>
                {new Date(w.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {w.totalVolumeKg ? (
              <View style={styles.volBadge}>
                <Text style={styles.volBadgeVal}>{Math.round(w.totalVolumeKg).toLocaleString()} kg</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.workoutCardDivider} />
          <View style={styles.workoutCardBottom}>
            <View style={styles.workoutStatCol}>
              <Clock size={13} color={colors.textMuted} />
              <Text style={styles.workoutStatVal}>{w.durationMinutes ? `${w.durationMinutes} min` : '—'}</Text>
            </View>
            <View style={styles.workoutStatCol}>
              <Award size={13} color={colors.milestone} />
              <Text style={styles.workoutStatVal}>{w.entries.length} Exercises</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {workouts.length === 0 && !loadingOverview && (
        <View style={styles.emptyBox}>
          <Dumbbell size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>No workout logs found. Start logging to build your profile history!</Text>
        </View>
      )}
      </>
      )}
    </ScrollView>
  );

  const renderExercises = () => (
    <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search your library & PRs..."
          placeholderTextColor={colors.textMuted}
          value={exerciseSearch}
          onChangeText={setExerciseSearch}
        />
      </View>

      <Text style={styles.sectionLabel}>
        {exerciseSearch.trim() ? 'SEARCH RESULTS' : 'RECENTLY PERFORMED'}
      </Text>

      {loadingEx ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : exerciseResults.length > 0 ? (
        exerciseResults.map((ex) => {
          const pr = prs[ex.id];
          const isCardio = ex.category?.toLowerCase() === 'cardio' || ex.trackingType === 'duration' || ex.trackingType === 'reps_only';
          return (
            <TouchableOpacity key={ex.id} activeOpacity={0.8} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: ex.id })}>
            <View style={styles.exercisePremiumCard}>
              <View style={styles.exCardTop}>
                <View style={styles.exThumbnail}>
                  <Text style={styles.exThumbText}>{(ex.muscleGroup || '?').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.exDetails}>
                  <Text style={styles.exTitle} numberOfLines={1}>{ex.name}</Text>
                  <Text style={styles.exSubtitle}>{ex.muscleGroup || 'Other'} • {ex.equipment || 'No equipment'}</Text>
                </View>
              </View>
              {pr && (!isCardio || pr.bestWeightKg > 0) ? (
                <View style={styles.exPrRow}>
                  {!isCardio && (
                    <View style={styles.prBox}>
                      <Text style={styles.prLabel}>EST. 1RM</Text>
                      <Text style={styles.prValue}>{convertWeightToDisplay(pr.estimated1RM, system).toFixed(1)} {getWeightUnit(system)}</Text>
                    </View>
                  )}
                  <View style={styles.prBox}>
                    <Text style={styles.prLabel}>BEST LIFT</Text>
                    <Text style={styles.prValue}>{convertWeightToDisplay(pr.bestWeightKg, system).toFixed(1)} {getWeightUnit(system)} × {pr.bestReps}</Text>
                  </View>
                  <View style={styles.prTrendBadge}>
                    <TrendingUp size={12} color={colors.primary} />
                    <Text style={styles.trendPercent}>Active</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.exPrRow}>
                  <Text style={styles.noPrText}>No PR logged yet. Hit PRs in workouts.</Text>
                </View>
              )}
            </View>
            </TouchableOpacity>
          );
        })
      ) : exerciseSearch.trim() ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No matching exercises found.</Text>
        </View>
      ) : (
        // Renders exercises that have PRs as their recently performed list
        Object.keys(prs).length > 0 ? (
          Object.values(prs).slice(0, 8).map((pr) => {
            const ex = prExercises[pr.exerciseId];
            const exName = ex?.name || pr.exerciseId.replace(/_/g, ' ');
            const exMuscle = ex?.muscleGroup || 'Other';
            const isCardio = ex?.category?.toLowerCase() === 'cardio' || ex?.trackingType === 'duration' || ex?.trackingType === 'reps_only';
            
            return (
              <TouchableOpacity key={pr.exerciseId} activeOpacity={0.8} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: pr.exerciseId })}>
              <View style={styles.exercisePremiumCard}>
                <View style={styles.exCardTop}>
                  <View style={[styles.exThumbnail, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                    <Text style={[styles.exThumbText, { color: '#06b6d4' }]}>{exMuscle.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.exDetails}>
                    <Text style={styles.exTitle} numberOfLines={1}>{exName}</Text>
                    <Text style={styles.exSubtitle}>Personal Record achieved on {pr.achievedOn}</Text>
                  </View>
                </View>
                <View style={styles.exPrRow}>
                  {!isCardio && (
                    <View style={styles.prBox}>
                      <Text style={styles.prLabel}>EST. 1RM</Text>
                      <Text style={styles.prValue}>{convertWeightToDisplay(pr.estimated1RM, system).toFixed(1)} {getWeightUnit(system)}</Text>
                    </View>
                  )}
                  <View style={styles.prBox}>
                    <Text style={styles.prLabel}>BEST LIFT</Text>
                    <Text style={styles.prValue}>{convertWeightToDisplay(pr.bestWeightKg, system).toFixed(1)} {getWeightUnit(system)} × {pr.bestReps}</Text>
                  </View>
                  <View style={styles.prTrendBadge}>
                    <TrendingUp size={12} color={colors.primary} />
                    <Text style={styles.trendPercent}>+PR</Text>
                  </View>
                </View>
              </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <Dumbbell size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>Exercises will appear here once you've logged workouts and set personal records.</Text>
          </View>
        )
      )}
    </ScrollView>
  );

  const renderMeasures = () => {
    const goalLatestEntry = activeGoal ? latestByType[activeGoal.measurementType] : null;

    const formatGoalValue = (val: number, goalUnit: string, measurementType: string) => {
      if (goalUnit === 'kg' || measurementType === 'weight') {
        return convertWeightToDisplay(val, system);
      } else if (goalUnit === 'cm') {
        return convertCmToDisplay(val, system);
      }
      return val;
    };

    const getGoalUnitLabel = (goalUnit: string, measurementType: string) => {
      if (goalUnit === 'kg' || measurementType === 'weight') {
        return getWeightUnit(system);
      } else if (goalUnit === 'cm') {
        return getMeasurementUnit(system);
      }
      return goalUnit;
    };

    const formatGoalValueStr = (val: number, goalUnit: string, measurementType: string) => {
      const converted = formatGoalValue(val, goalUnit, measurementType);
      if (goalUnit === 'kg' || measurementType === 'weight') {
        return converted.toFixed(1);
      } else if (goalUnit === 'cm') {
        return converted.toFixed(2);
      }
      return converted.toString();
    };

    const goalLatestValStr = (activeGoal && goalLatestEntry)
      ? formatGoalValueStr(goalLatestEntry.value, activeGoal.unit, activeGoal.measurementType)
      : null;

    const progressPct = activeGoal ? (() => {
      const currentVal = goalLatestEntry?.value ?? activeGoal.startValue;
      const totalDiff = Math.abs(activeGoal.startValue - activeGoal.targetValue);
      const doneDiff = Math.abs(activeGoal.startValue - currentVal);
      return totalDiff === 0 ? 100 : Math.min(100, Math.round((doneDiff / totalDiff) * 100));
    })() : 0;

    return (
      <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
        {errorMeasures ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load measurements.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadMeasuresData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.measuresActionRow}>
              <TouchableOpacity style={styles.logCTA} onPress={() => setShowLogModal(true)}>
                <Scale size={16} color={colors.primaryDark} style={{ marginRight: 6 }} />
                <Text style={styles.logCTAText}>+ Log Measurements</Text>
              </TouchableOpacity>
            </View>

        {/* Active Weight Goal Card */}
        {activeGoal ? (
          <View style={styles.goalPremiumCard}>
            <View style={styles.goalTopRow}>
              <View>
                <Text style={styles.goalLabel}>ACTIVE TARGET GOAL</Text>
                <Text style={styles.goalTitle}>{activeGoal.type.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
              <Target size={20} color={colors.primary} />
            </View>
            <View style={styles.goalBodyRow}>
              <Text style={styles.goalDetailVal}>
                {`${formatGoalValueStr(activeGoal.startValue, activeGoal.unit, activeGoal.measurementType)} → ${formatGoalValueStr(activeGoal.targetValue, activeGoal.unit, activeGoal.measurementType)} ${getGoalUnitLabel(activeGoal.unit, activeGoal.measurementType)}`}
              </Text>
              {goalLatestValStr !== null && (
                <Text style={styles.goalCurrentVal}>Current: {goalLatestValStr} {getGoalUnitLabel(activeGoal.unit, activeGoal.measurementType)}</Text>
              )}
            </View>
            <View style={styles.goalProgressBg}>
              <View style={[styles.goalProgressFill, { width: `${progressPct}%` as any }]} />
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.createGoalRowBtn} activeOpacity={0.8} onPress={() => navigation.navigate('GoalSetup')}>
            <Target size={18} color={colors.primary} />
            <Text style={styles.createGoalRowText}>Set a body metric target goal</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Measures Grid list */}
        <Text style={styles.sectionLabel}>BODY & METRIC STATS</Text>
        
        {/* Caloric intake card */}
        <View style={styles.measureTileCard}>
          <View style={styles.meaTileHeader}>
            <View style={styles.meaTitleCol}>
              <Text style={styles.meaTitle}>Caloric Intake</Text>
              <Text style={styles.meaDate}>Today</Text>
            </View>
            <Utensils size={16} color={colors.warning} />
          </View>
          <View style={styles.meaTileBody}>
            <Text style={styles.meaTileVal}>{todayCalories !== null ? todayCalories : '—'}</Text>
            <Text style={styles.meaTileUnit}>kcal</Text>
          </View>
        </View>

        {loadingMeasures ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.measuresGrid}>
            {MEASUREMENT_TILES.map(t => {
              const entry = latestByType[t.type];
              const history = historyByType[t.type] || [];
              const displayUnit = t.type === 'weight'
                ? getWeightUnit(system)
                : (t.type === 'body_fat' ? '%' : getMeasurementUnit(system));

              const displayVal = entry
                ? (t.type === 'weight'
                    ? convertWeightToDisplay(entry.value, system)
                    : (t.type === 'body_fat' ? entry.value : convertCmToDisplay(entry.value, system)))
                : null;

              // Convert history values for trend chart
              const convertedHistory = history.map(h => ({
                ...h,
                value: t.type === 'weight'
                  ? convertWeightToDisplay(h.value, system)
                  : (t.type === 'body_fat' ? h.value : convertCmToDisplay(h.value, system))
              }));

              return (
                <TouchableOpacity
                  key={t.type}
                  style={styles.measureTileCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('MeasurementHistory', { type: t.type, unit: displayUnit })}
                >
                  <View style={styles.meaTileHeader}>
                    <View style={styles.meaTitleCol}>
                      <Text style={styles.meaTitle}>{t.label}</Text>
                      <Text style={styles.meaDate}>
                        {entry ? new Date(entry.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No logs'}
                      </Text>
                    </View>
                    {convertedHistory.length > 1 && <MiniTrendChart history={convertedHistory} />}
                  </View>
                  <View style={styles.meaTileBody}>
                    {displayVal !== null ? (
                      <>
                        <Text style={styles.meaTileVal}>{displayVal}</Text>
                        <Text style={styles.meaTileUnit}>{displayUnit}</Text>
                      </>
                    ) : (
                      <Text style={styles.meaTileNoLogs}>No logs</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </>
      )}
    </ScrollView>
  );
};

  const renderPhotos = () => (
    <View style={[styles.tabContent, styles.photosEmptyContainer]}>
      <View style={styles.photosIconCircle}>
        <Camera size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.photosTitle}>Private Progress Photos</Text>
      <Text style={styles.photosDesc}>
        Track your body's physical transformation privately. Photo storage is not yet connected to your profile. All uploaded photos will be saved locally on your device.
      </Text>
      <TouchableOpacity style={styles.photosCta} activeOpacity={0.8}>
        <Text style={styles.photosCtaText}>Upload Photo (Coming Soon)</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={[styles.profileAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.profileAvatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.displayName}</Text>
          {profile.username && <Text style={styles.profileUsername}>@{profile.username}</Text>}
          <Text style={styles.profileGoal}>{profile.goal ? profile.goal.toUpperCase() : 'FITNESS PROFILE'}</Text>
        </View>
        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Settings')}>
            <Settings size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weight display */}
      {weightChange && (
        <View style={styles.weightBanner}>
          <Scale size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.weightVal}>{weightChange}</Text>
          <Text style={styles.weightLbl}>Current Weight</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'exercises', 'measures', 'photos'] as MeTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'exercises' && renderExercises()}
        {activeTab === 'measures' && renderMeasures()}
        {activeTab === 'photos' && renderPhotos()}
      </View>

      {/* Log Measurements Modal */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLogModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Measurements</Text>
            <TouchableOpacity onPress={() => setShowLogModal(false)} style={{ padding: spacing.xs }}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
            {LOG_FIELDS.map(field => (
              <View key={field.type} style={styles.logFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logFieldLabel}>{field.label} ({field.unit})</Text>
                </View>
                <TextInput
                  style={styles.logFieldInput}
                  keyboardType="decimal-pad"
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={logValues[field.type] || ''}
                  onChangeText={val => setLogValues(prev => ({ ...prev, [field.type]: val }))}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.saveBtn, logSaving && { opacity: 0.5 }]} onPress={handleLogMeasurements} disabled={logSaving}>
              {logSaving ? <ActivityIndicator size="small" color={colors.primaryDark} /> : <Text style={styles.saveBtnText}>Save Measurements</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },

  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileInfo: { flex: 1, flexShrink: 1, gap: 2 },
  profileName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  profileUsername: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  profileGoal: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  profileActions: { flexDirection: 'row', gap: spacing.sm },
  headerIconBtn: { padding: spacing.xs },

  weightBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  weightVal: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  weightLbl: { color: colors.textMuted, fontSize: 12, marginLeft: 6 },
  meaTileNoLogs: { color: colors.textMuted, fontSize: 15, fontWeight: '600', alignSelf: 'flex-start' },

  errorContainer: { padding: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginVertical: spacing.md, gap: spacing.md, width: '100%' },
  errorText: { color: '#ef4444', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill },
  retryBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.xs },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  tabTextActive: { color: colors.primary },

  tabContent: { padding: spacing.md, gap: spacing.md },

  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.sm, marginBottom: 4 },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4 },
  statNum: { color: colors.text, fontSize: 22, fontWeight: '900' },
  statLbl: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  navRow: { flexDirection: 'row', gap: spacing.sm },
  navBtn: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', gap: 4 },
  navBtnText: { color: colors.text, fontSize: 10, fontWeight: '600' },

  // Muscle Activity Visual Redesign Card
  muscleContainerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  muscleSectionHeader: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  bodyVizRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs },
  bodyVizItem: { alignItems: 'center', gap: spacing.xs },
  bodyVizLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.text, fontSize: 11, fontWeight: '600' },

  // Workout History Premium Cards
  historySectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: spacing.sm },
  seeAllLink: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  workoutPremiumCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 10 },
  workoutCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutTitleCol: { gap: 2 },
  workoutName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  workoutDate: { color: colors.textMuted, fontSize: 12 },
  volBadge: { backgroundColor: 'rgba(72,187,149,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  volBadgeVal: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  workoutCardDivider: { height: 1, backgroundColor: colors.border },
  workoutCardBottom: { flexDirection: 'row', gap: spacing.lg },
  workoutStatCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  workoutStatVal: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  emptyBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 18 },
  ctaBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 8, marginTop: spacing.sm },
  ctaBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  searchRow: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 11, color: colors.text, fontSize: 15 },

  // Premium Exercise Cards (1RM & mini progress line)
  exercisePremiumCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 12, marginBottom: spacing.sm },
  exCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exThumbnail: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(72,187,149,0.15)', alignItems: 'center', justifyContent: 'center' },
  exThumbText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  exDetails: { flex: 1, gap: 2 },
  exTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  exSubtitle: { color: colors.textMuted, fontSize: 11, textTransform: 'capitalize' },
  exPrRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: spacing.lg },
  prBox: { flex: 1, gap: 2 },
  prLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  prValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  prTrendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(72,187,149,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  trendPercent: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  noPrText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },

  // Measures Tab Redesign Layout
  measuresActionRow: { paddingBottom: spacing.xs },
  logCTA: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  logCTAText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },

  createGoalRowBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(72,187,149,0.06)', borderWidth: 1, borderColor: 'rgba(72,187,149,0.2)', borderRadius: radius.md, padding: spacing.md },
  createGoalRowText: { flex: 1, color: colors.primary, fontSize: 14, fontWeight: '700' },

  goalPremiumCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 10 },
  goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  goalTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 1 },
  goalBodyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  goalDetailVal: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  goalCurrentVal: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  goalProgressBg: { height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden' },
  goalProgressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  measuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  measureTileCard: { width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.xs },
  meaTileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', height: 28 },
  meaTitleCol: { gap: 1 },
  meaTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  meaDate: { color: colors.textMuted, fontSize: 10 },
  sparkline: { width: 60, height: 22, overflow: 'hidden', opacity: 0.8 },
  meaTileBody: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: spacing.xs },
  meaTileVal: { color: colors.text, fontSize: 22, fontWeight: '900' },
  meaTileUnit: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  // Photos Tab premium empty state
  photosEmptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, minHeight: 380 },
  photosIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  photosTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  photosDesc: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  photosCta: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: spacing.lg },
  photosCtaText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },

  // Modal styling
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  logFieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  logFieldLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  logFieldInput: { width: 100, color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'right', paddingVertical: 0 },
  modalFooter: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  saveBtnText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  duoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  duoBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
});
