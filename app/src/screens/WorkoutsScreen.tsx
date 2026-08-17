import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../theme/colors';
import RoutineLibraryScreen from './RoutineLibraryScreen';
import ExerciseLibraryScreen from './ExerciseLibraryScreen';
import { getExercises, getMyPlans, getPublicPlans } from '../services';
import { exerciseToView, planToRoutine } from '../services/adapters';
import { useCurrentUser } from '../context/CurrentUser';
import type { Routine, Exercise } from '../types/ironsync';

type SubTab = 'routines' | 'exercises';

/**
 * Workouts tab — Routine Library (real plans) + Exercise Library (real 873).
 * The "Create" button pushes the PlanBuilder (see WorkoutsStack).
 */
export default function WorkoutsScreen({
  navigation,
}: {
  navigation: { navigate: (screen: string, params?: { planId?: string }) => void };
}) {
  const { profile } = useCurrentUser();
  const [tab, setTab] = useState<SubTab>('routines');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Real exercise library (873), loaded once.
  useEffect(() => {
    getExercises().then((list) => setExercises(list.map(exerciseToView)));
  }, []);

  // Real plans: mine (public + private) + everyone's public, de-duped. Refetched
  // on focus so a plan you just created shows up when you come back from the builder.
  const loadPlans = useCallback(async () => {
    const uid = profile?.id;
    const [mine, pub] = await Promise.all([uid ? getMyPlans(uid) : [], getPublicPlans()]);
    const byId = new Map(pub.map((p) => [p.id, p]));
    mine.forEach((p) => byId.set(p.id, p));
    setRoutines([...byId.values()].map(planToRoutine));
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans]),
  );

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('LogWorkout')} activeOpacity={0.85}>
        <Text style={styles.logBtnText}>🏋️  Log a Workout</Text>
      </TouchableOpacity>

      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segment, tab === 'routines' && styles.segmentActive]}
          onPress={() => setTab('routines')}
        >
          <Text style={[styles.segmentText, tab === 'routines' && styles.segmentTextActive]}>Routines</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === 'exercises' && styles.segmentActive]}
          onPress={() => setTab('exercises')}
        >
          <Text style={[styles.segmentText, tab === 'exercises' && styles.segmentTextActive]}>Exercises</Text>
        </TouchableOpacity>
      </View>

      {tab === 'routines' ? (
        <RoutineLibraryScreen
          routines={routines}
          currentUserName={profile?.displayName}
          onStartRoutine={(r: Routine) => {
            // Your own plan → edit it. Someone else's public plan → adopt it.
            if (r.creator === profile?.displayName) {
              navigation.navigate('PlanBuilder', { planId: r.id });
            } else {
              navigation.navigate('AdoptPlan', { planId: r.id });
            }
          }}
          onSaveRoutineToggle={() => {}}
          onCreateRoutineClick={() => navigation.navigate('PlanBuilder')}
        />
      ) : (
        <ExerciseLibraryScreen exercises={exercises} onSelectExercise={(_e: Exercise) => {}} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  logBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  segmentWrap: {
    flexDirection: 'row',
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: colors.primaryDark },
});
