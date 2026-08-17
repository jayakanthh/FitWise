import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, spacing } from '../theme/colors';
import type { Exercise } from '../models';
import { currentUserId, getExercises, logWorkout } from '../services';
import { useCurrentUser } from '../context/CurrentUser';

interface LoggedSet {
  reps: string;
  weightKg: string;
}
interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
}

/**
 * Log an ad-hoc workout (not tied to a plan). Pick exercises, enter sets
 * (reps × kg), save → logWorkout updates your streak, PRs, and crew boards.
 */
export default function LogWorkoutScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { refresh } = useCurrentUser();
  const [items, setItems] = useState<LoggedExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addExercise = (ex: Exercise) => {
    if (items.some((i) => i.exerciseId === ex.id)) return;
    setItems((prev) => [
      ...prev,
      { exerciseId: ex.id, name: ex.name, sets: [{ reps: '10', weightKg: '20' }] },
    ]);
    setPickerOpen(false);
  };
  const removeExercise = (id: string) => setItems((prev) => prev.filter((i) => i.exerciseId !== id));
  const addSet = (id: string) =>
    setItems((prev) =>
      prev.map((i) => {
        if (i.exerciseId !== id) return i;
        const last = i.sets[i.sets.length - 1];
        return { ...i, sets: [...i.sets, last ? { ...last } : { reps: '10', weightKg: '20' }] };
      }),
    );
  const removeSet = (id: string, idx: number) =>
    setItems((prev) =>
      prev.map((i) =>
        i.exerciseId === id ? { ...i, sets: i.sets.filter((_, n) => n !== idx) } : i,
      ),
    );
  const editSet = (id: string, idx: number, field: keyof LoggedSet, value: string) =>
    setItems((prev) =>
      prev.map((i) =>
        i.exerciseId === id
          ? {
              ...i,
              sets: i.sets.map((s, n) => (n === idx ? { ...s, [field]: value } : s)),
            }
          : i,
      ),
    );

  const totalSets = items.reduce((n, i) => n + i.sets.length, 0);

  const save = async () => {
    const uid = currentUserId();
    if (!uid) return;
    if (items.length === 0) return setError('Add at least one exercise.');
    setError(null);
    setSaving(true);
    try {
      const entries = items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: i.sets.map((s) => ({ reps: Number(s.reps) || 0, weightKg: Number(s.weightKg) || 0 })),
      }));
      const result = await logWorkout(uid, { date: '', entries, notes });
      await refresh();
      const prLine = result.newPRs.length
        ? `\n🏆 ${result.newPRs.length} new PR${result.newPRs.length === 1 ? '' : 's'}!`
        : '';
      Alert.alert('Workout logged 💪', `Streak: ${result.streak.currentStreak} 🔥${prLine}`, [
        { text: 'Nice', onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not log workout');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Workout</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.save}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 && (
          <Text style={styles.empty}>Add the exercises you did today.</Text>
        )}

        {items.map((item) => (
          <View key={item.exerciseId} style={styles.exCard}>
            <View style={styles.exHead}>
              <Text style={styles.exName}>{item.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(item.exerciseId)}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.setHeaderRow}>
              <Text style={[styles.setLabel, { width: 40 }]}>SET</Text>
              <Text style={[styles.setLabel, { flex: 1 }]}>REPS</Text>
              <Text style={[styles.setLabel, { flex: 1 }]}>KG</Text>
              <View style={{ width: 28 }} />
            </View>
            {item.sets.map((s, idx) => (
              <View key={idx} style={styles.setRow}>
                <Text style={styles.setNum}>{idx + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  value={s.reps}
                  onChangeText={(t) => editSet(item.exerciseId, idx, 'reps', t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.setInput}
                  value={s.weightKg}
                  onChangeText={(t) => editSet(item.exerciseId, idx, 'weightKg', t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={{ width: 28, alignItems: 'center' }} onPress={() => removeSet(item.exerciseId, idx)}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addSet} onPress={() => addSet(item.exerciseId)}>
              <Text style={styles.addSetText}>+ Add set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addExBtn} onPress={() => setPickerOpen(true)}>
          <Text style={styles.addExText}>+ Add exercise</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.notes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {items.length > 0 && (
          <Text style={styles.summary}>{items.length} exercises · {totalSets} sets</Text>
        )}
      </ScrollView>

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercise} />
    </SafeAreaView>
  );
}

function ExercisePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ex: Exercise) => void;
}) {
  const [all, setAll] = useState<Exercise[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (visible && all.length === 0) getExercises().then((l) => { setAll(l); setLoading(false); });
  }, [visible, all.length]);
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return s ? all.filter((e) => e.name.toLowerCase().includes(s)) : all;
  }, [q, all]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Add exercise</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.save}>Done</Text></TouchableOpacity>
        </View>
        <TextInput
          style={[styles.notes, { marginHorizontal: spacing.md, minHeight: 0 }]}
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
              const thumb = item.gifUrl ?? item.images?.[0];
              return (
                <TouchableOpacity style={styles.pickRow} onPress={() => onPick(item)}>
                  {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : <View style={styles.thumb} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{item.name}</Text>
                    <Text style={styles.setLabel}>{item.muscleGroup}</Text>
                  </View>
                  <Text style={styles.pickAdd}>+</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
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
  empty: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  exCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  setLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setNum: { color: colors.textMuted, width: 40, fontSize: 14, fontWeight: '700' },
  setInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
  },
  addSet: { paddingVertical: 8 },
  addSetText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  addExBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addExText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  notes: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    minHeight: 60,
  },
  error: { color: '#F87171', fontSize: 13 },
  summary: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
  },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.surfaceAlt },
  pickAdd: { color: colors.primary, fontSize: 22, fontWeight: '800', width: 28, textAlign: 'center' },
});
