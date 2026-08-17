import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import RoutineLibraryScreen from './RoutineLibraryScreen';
import ExerciseLibraryScreen from './ExerciseLibraryScreen';
import { initialRoutines } from '../data/mockData';
import { getExercises } from '../services';
import { exerciseToView } from '../services/adapters';
import type { Routine, Exercise } from '../types/ironsync';

type SubTab = 'routines' | 'exercises';

/**
 * Workouts tab — hosts Routine Library + Exercise Library from iron-sync,
 * toggled with a segmented control (iron-sync used separate nav stack entries).
 * TEMP: onStartRoutine/onSaveRoutineToggle are no-ops — wire to LiveWorkoutScreen
 * and Firestore once those land.
 */
export default function WorkoutsScreen() {
  const [tab, setTab] = useState<SubTab>('routines');
  const [routines, setRoutines] = useState(initialRoutines);
  // Real exercise library (873 exercises from Firestore), mapped to the UI shape.
  const [exercises, setExercises] = useState<Exercise[]>([]);
  useEffect(() => {
    getExercises().then((list) => setExercises(list.map(exerciseToView)));
  }, []);

  const toggleSave = (id: string) => {
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, isSaved: !r.isSaved } : r)));
  };

  return (
    <View style={styles.screen}>
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
          onStartRoutine={(_r: Routine) => {}}
          onSaveRoutineToggle={toggleSave}
          onCreateRoutineClick={() => {}}
        />
      ) : (
        <ExerciseLibraryScreen
          exercises={exercises}
          onSelectExercise={(_e: Exercise) => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
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
