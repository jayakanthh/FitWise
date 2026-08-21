import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Plus, Dumbbell } from 'lucide-react-native';
import { colors, spacing, radius, useTheme } from '../../theme/colors';
import RoutineLibraryScreen from './RoutineLibraryScreen';
import ExerciseLibraryScreen from './ExerciseLibraryScreen';
import { adjustPlanSavedCount, getExercises, searchExercises, getMyPlans, getPublicPlans, toggleSavedPlan } from '../../services/index';
import { exerciseToView, planToRoutine } from '../../adapters/adapters';
import { useCurrentUser } from '../../context/CurrentUser';
import type { Routine, Exercise } from '../../types/ironsync';

type SubTab = 'routines' | 'exercises';

export default function WorkoutsScreen({
  navigation,
}: {
  navigation: { navigate: (screen: string, params?: any) => void };
}) {
  const insets = useSafeAreaInsets();
  const { profile, refresh } = useCurrentUser();
  const [tab, setTab] = useState<SubTab>('routines');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Real exercise library (loaded once on component mount)
  useEffect(() => {
    getExercises(100).then((res) => setExercises(res.data.map(exerciseToView)));
  }, []);

  // Real plans: mine (public + private) + everyone's public, de-duped
  const loadPlans = useCallback(async () => {
    const uid = profile?.id;
    const [mine, pub] = await Promise.all([uid ? getMyPlans(uid) : [], getPublicPlans()]);
    const byId = new Map(pub.map((p) => [p.id, p]));
    mine.forEach((p) => byId.set(p.id, p));
    const savedIds = new Set(profile?.savedPlanIds ?? []);
    setRoutines([...byId.values()].map((p) => planToRoutine(p, savedIds.has(p.id))));
  }, [profile?.id, profile?.savedPlanIds]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans]),
  );

  const handleSaveToggle = async (routineId: string) => {
    if (!profile) return;
    const target = routines.find((r) => r.id === routineId);
    if (!target) return;
    const nextSaved = !target.isSaved;

    // Optimistic UI update
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId ? { ...r, isSaved: nextSaved, saves: r.saves + (nextSaved ? 1 : -1) } : r,
      ),
    );
    try {
      await Promise.all([
        toggleSavedPlan(profile.id, routineId, nextSaved),
        adjustPlanSavedCount(routineId, nextSaved ? 1 : -1),
      ]);
      await refresh();
    } catch {
      // Revert on failure
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === routineId ? { ...r, isSaved: !nextSaved, saves: r.saves + (nextSaved ? -1 : 1) } : r,
        ),
      );
    }
  };

  const { theme } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Exercise Hub Launch Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary, fontWeight: theme.typography.headingWeight }]}>Exercise Hub</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Start training splits or log free workouts</Text>
      </View>

      {/* Start Workout Primary CTA - Free Workout */}
      <TouchableOpacity
        style={[styles.startWorkoutCta, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
        activeOpacity={0.9}
        onPress={() => {
          // Navigates immediately to LogWorkout with empty exercises and starts timer
          navigation.navigate('LogWorkout', {
            exercises: [],
            sourceLabel: 'Free Workout',
          });
        }}
      >
        <View style={styles.ctaContent}>
          <Play size={20} color={theme.colors.primaryForeground} fill={theme.colors.primaryForeground} />
          <Text style={[styles.startWorkoutText, { color: theme.colors.primaryForeground }]}>+ Start Free Workout</Text>
        </View>
      </TouchableOpacity>

      {/* Selector Tabs */}
      <View style={[styles.segmentWrap, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.segment, tab === 'routines' && [styles.segmentActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setTab('routines')}
        >
          <Text style={[styles.segmentText, { color: tab === 'routines' ? theme.colors.primaryForeground : theme.colors.textSecondary }]}>ROUTINES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === 'exercises' && [styles.segmentActive, { backgroundColor: theme.colors.primary }]]}
          onPress={() => setTab('exercises')}
        >
          <Text style={[styles.segmentText, { color: tab === 'exercises' ? theme.colors.primaryForeground : theme.colors.textSecondary }]}>EXERCISES</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Screen Content */}
      <View style={{ flex: 1 }}>
        {tab === 'routines' ? (
          <RoutineLibraryScreen
            routines={routines}
            currentUserName={profile?.displayName}
            onStartRoutine={(r: Routine) => {
              if (r.creator === profile?.displayName) {
                // Preloads routine exercises into LogWorkout logger
                navigation.navigate('LogWorkout', {
                  exercises: r.exercises.map((ex) => ({
                    exerciseId: ex.exerciseId,
                    name: ex.name,
                    targetSets: ex.sets,
                    targetReps: parseInt(ex.reps) || 10,
                  })),
                  sourceLabel: r.name,
                });
              } else {
                // Public plan → adopt first
                navigation.navigate('AdoptPlan', { planId: r.id });
              }
            }}
            onSaveRoutineToggle={handleSaveToggle}
            onCreateRoutineClick={() => navigation.navigate('PlanBuilder')}
          />
        ) : (
          <ExerciseLibraryScreen
            exercises={exercises}
            onSelectExercise={(e: Exercise) => {
              // Launches same LogWorkout logger preloaded with selected exercise
              navigation.navigate('LogWorkout', {
                exercises: [{ exerciseId: e.id, name: e.name, targetSets: e.defaultSets || 3, targetReps: parseInt(e.defaultReps) || 10 }],
                sourceLabel: e.name,
              });
            }}
            onSearchChange={(q: string) => {
              if (q.trim().length >= 2) {
                searchExercises(q.trim(), 100).then(res => setExercises(res.map(exerciseToView)));
              } else if (q.trim().length === 0) {
                getExercises(100).then(res => setExercises(res.data.map(exerciseToView)));
              }
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: 2 },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: colors.textMuted, fontSize: 13 },
  
  startWorkoutCta: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startWorkoutText: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },

  segmentWrap: {
    flexDirection: 'row',
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  segmentTextActive: { color: colors.primaryDark },
});