import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, spacing } from '../theme/colors';
import type { Exercise, PlanDay } from '../models';
import { createPlan, currentUserId, getExercises } from '../services';
import { useCurrentUser } from '../context/CurrentUser';

interface BuilderExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
}
interface BuilderDay {
  label: string;
  exercises: BuilderExercise[];
}

/**
 * Plan builder — name a plan, add days, pick real exercises per day, choose
 * public/private, and save it. Pushed onto the Workouts stack from "Create".
 */
export default function PlanBuilderScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { profile, refresh } = useCurrentUser();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [days, setDays] = useState<BuilderDay[]>([{ label: 'Day 1', exercises: [] }]);
  const [activeDay, setActiveDay] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDay = () =>
    setDays((d) => {
      setActiveDay(d.length);
      return [...d, { label: `Day ${d.length + 1}`, exercises: [] }];
    });

  const addExercise = (ex: Exercise) =>
    setDays((d) =>
      d.map((day, i) =>
        i === activeDay
          ? day.exercises.some((e) => e.exerciseId === ex.id)
            ? day // already added
            : {
                ...day,
                exercises: [
                  ...day.exercises,
                  { exerciseId: ex.id, name: ex.name, targetSets: 3, targetReps: 10 },
                ],
              }
          : day,
      ),
    );

  const removeExercise = (exerciseId: string) =>
    setDays((d) =>
      d.map((day, i) =>
        i === activeDay
          ? { ...day, exercises: day.exercises.filter((e) => e.exerciseId !== exerciseId) }
          : day,
      ),
    );

  const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0);

  const save = async () => {
    const uid = currentUserId();
    if (!uid) return;
    if (!name.trim()) return setError('Give your plan a name.');
    if (totalExercises === 0) return setError('Add at least one exercise.');
    setError(null);
    setSaving(true);
    try {
      const planDays: PlanDay[] = days.map((d) => ({
        label: d.label,
        exercises: d.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
        })),
      }));
      await createPlan(uid, {
        name: name.trim(),
        days: planDays,
        visibility,
        authorName: profile?.displayName,
      });
      await refresh();
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save plan');
      setSaving(false);
    }
  };

  const current = days[activeDay];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Plan</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.save}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.nameInput}
          placeholder="Plan name (e.g. Push/Pull/Legs)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* Visibility */}
        <View style={styles.visRow}>
          {(['private', 'public'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.visBtn, visibility === v && styles.visBtnOn]}
              onPress={() => setVisibility(v)}
            >
              <Text style={[styles.visText, visibility === v && styles.visTextOn]}>
                {v === 'private' ? '🔒 Private' : '🌍 Public'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>
          {visibility === 'public'
            ? 'Anyone can find and use this plan.'
            : 'Only you can see this plan.'}
        </Text>

        {/* Day tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
          {days.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayTab, i === activeDay && styles.dayTabOn]}
              onPress={() => setActiveDay(i)}
            >
              <Text style={[styles.dayTabText, i === activeDay && styles.dayTabTextOn]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addDay} onPress={addDay}>
            <Text style={styles.addDayText}>+ Day</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Current day exercises */}
        {current.exercises.length === 0 ? (
          <Text style={styles.empty}>No exercises yet. Add some below.</Text>
        ) : (
          current.exercises.map((e) => (
            <View key={e.exerciseId} style={styles.exRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{e.name}</Text>
                <Text style={styles.exMeta}>
                  {e.targetSets} sets × {e.targetReps} reps
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(e.exerciseId)}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.addExBtn} onPress={() => setPickerOpen(true)}>
          <Text style={styles.addExText}>+ Add exercise to {current.label}</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        addedIds={current.exercises.map((e) => e.exerciseId)}
      />
    </SafeAreaView>
  );
}

/** Modal list of the real exercise library, searchable, tap to add. */
function ExercisePicker({
  visible,
  onClose,
  onPick,
  addedIds,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ex: Exercise) => void;
  addedIds: string[];
}) {
  const [all, setAll] = useState<Exercise[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && all.length === 0) {
      getExercises().then((list) => {
        setAll(list);
        setLoading(false);
      });
    }
  }, [visible, all.length]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return s ? all.filter((e) => e.name.toLowerCase().includes(s)) : all;
  }, [q, all]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Modal renders outside the app's SafeAreaProvider, so it needs its own. */}
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Add exercise</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.save}>Done</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.nameInput, { marginHorizontal: spacing.md }]}
          placeholder="Search 873 exercises…"
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
        />
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}
            initialNumToRender={20}
            renderItem={({ item }) => {
              const added = addedIds.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.pickRow, added && styles.pickRowOn]}
                  onPress={() => onPick(item)}
                  disabled={added}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{item.name}</Text>
                    <Text style={styles.exMeta}>{item.muscleGroup}</Text>
                  </View>
                  <Text style={styles.pickAdd}>{added ? '✓' : '+'}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cancel: { color: colors.textMuted, fontSize: 15 },
  save: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  content: { padding: spacing.md, gap: spacing.md },
  nameInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  visRow: { flexDirection: 'row', gap: spacing.sm },
  visBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  visText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  visTextOn: { color: colors.primaryDark },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: -spacing.xs },
  dayTabs: { flexGrow: 0 },
  dayTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  dayTabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  dayTabTextOn: { color: colors.primaryDark },
  addDay: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addDayText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  exName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  exMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  addExBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addExText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  error: { color: '#F87171', fontSize: 13 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  pickRowOn: { opacity: 0.5 },
  pickAdd: { color: colors.primary, fontSize: 22, fontWeight: '800' },
});
