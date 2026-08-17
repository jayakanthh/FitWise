import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, spacing } from '../theme/colors';
import type { FoodLogEntry, Goal, Meal, NutritionTargets } from '../models';
import {
  currentUserId,
  deleteFood,
  getFoodLog,
  getNutritionTargets,
  logFood,
  setNutritionTargets,
  sumDay,
  todayISO,
} from '../services';
import { useCurrentUser } from '../context/CurrentUser';

/** Suggest daily targets from goal + bodyweight (rough, editable). */
function suggest(goal: Goal | undefined, weightKg = 75): NutritionTargets {
  const perKg = goal === 'cut' ? 28 : goal === 'bulk' ? 38 : 33;
  const dailyCalories = Math.round(weightKg * perKg);
  const proteinG = Math.round(weightKg * 2);
  const fatG = Math.round(weightKg * 1);
  const carbsG = Math.max(0, Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4));
  return { dailyCalories, proteinG, carbsG, fatG };
}

const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: '🍳 Breakfast' },
  { key: 'lunch', label: '🥗 Lunch' },
  { key: 'dinner', label: '🍽️ Dinner' },
  { key: 'snacks', label: '🍎 Snacks' },
];

export default function NutritionScreen() {
  const { profile } = useCurrentUser();
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // target edit form
  const [tCal, setTCal] = useState('');
  const [tP, setTP] = useState('');
  const [tC, setTC] = useState('');
  const [tF, setTF] = useState('');
  // food add form
  const [fMeal, setFMeal] = useState<Meal>('breakfast');
  const [fName, setFName] = useState('');
  const [fCal, setFCal] = useState('');
  const [fP, setFP] = useState('');
  const [fC, setFC] = useState('');
  const [fF, setFF] = useState('');

  const load = useCallback(async () => {
    const uid = currentUserId();
    if (!uid) return;
    const [t, log] = await Promise.all([getNutritionTargets(uid), getFoodLog(uid, todayISO())]);
    setTargets(t);
    setEntries(log);
    setLoading(false);
    if (!t) startEditing(suggest(profile?.goal, profile?.weightKg));
  }, [profile?.goal, profile?.weightKg]);

  useEffect(() => {
    load();
  }, [load]);

  const startEditing = (t: NutritionTargets) => {
    setTCal(`${t.dailyCalories}`);
    setTP(`${t.proteinG}`);
    setTC(`${t.carbsG}`);
    setTF(`${t.fatG}`);
    setEditing(true);
  };

  const saveTargets = async () => {
    const uid = currentUserId();
    if (!uid) return;
    const t: NutritionTargets = {
      dailyCalories: Number(tCal) || 0,
      proteinG: Number(tP) || 0,
      carbsG: Number(tC) || 0,
      fatG: Number(tF) || 0,
    };
    await setNutritionTargets(uid, t);
    setTargets(t);
    setEditing(false);
  };

  const addFood = async () => {
    const uid = currentUserId();
    if (!uid || !fName.trim()) return;
    await logFood(uid, {
      date: todayISO(),
      meal: fMeal,
      name: fName.trim(),
      calories: Number(fCal) || 0,
      proteinG: Number(fP) || 0,
      carbsG: Number(fC) || 0,
      fatG: Number(fF) || 0,
    });
    setFName(''); setFCal(''); setFP(''); setFC(''); setFF('');
    load();
  };

  const remove = async (id: string) => {
    const uid = currentUserId();
    if (!uid) return;
    await deleteFood(uid, id);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const totals = sumDay(entries);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Nutrition</Text>

      {editing || !targets ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily targets</Text>
          <Text style={styles.hint}>Suggested from your goal — tweak as you like.</Text>
          <NumRow label="Calories" value={tCal} onChange={setTCal} unit="kcal" />
          <NumRow label="Protein" value={tP} onChange={setTP} unit="g" />
          <NumRow label="Carbs" value={tC} onChange={setTC} unit="g" />
          <NumRow label="Fat" value={tF} onChange={setTF} unit="g" />
          <TouchableOpacity style={styles.saveBtn} onPress={saveTargets}>
            <Text style={styles.saveBtnText}>Save targets</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Today</Text>
            <TouchableOpacity onPress={() => startEditing(targets)}>
              <Text style={styles.edit}>Edit targets</Text>
            </TouchableOpacity>
          </View>
          <Bar label="Calories" have={totals.dailyCalories} goal={targets.dailyCalories} unit="kcal" />
          <Bar label="Protein" have={totals.proteinG} goal={targets.proteinG} unit="g" />
          <Bar label="Carbs" have={totals.carbsG} goal={targets.carbsG} unit="g" />
          <Bar label="Fat" have={totals.fatG} goal={targets.fatG} unit="g" />
        </View>
      )}

      {/* Add food */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Log food</Text>
        <View style={styles.mealRow}>
          {MEALS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.mealChip, fMeal === m.key && styles.mealChipOn]}
              onPress={() => setFMeal(m.key)}
            >
              <Text style={[styles.mealChipText, fMeal === m.key && styles.mealChipTextOn]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Food name (e.g. Chicken & rice)"
          placeholderTextColor={colors.textMuted}
          value={fName}
          onChangeText={setFName}
        />
        <View style={styles.macroRow}>
          <MiniInput label="kcal" value={fCal} onChange={setFCal} />
          <MiniInput label="P" value={fP} onChange={setFP} />
          <MiniInput label="C" value={fC} onChange={setFC} />
          <MiniInput label="F" value={fF} onChange={setFF} />
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, !fName.trim() && styles.btnDisabled]}
          onPress={addFood}
          disabled={!fName.trim()}
        >
          <Text style={styles.saveBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Today's log, grouped by meal */}
      <Text style={styles.section}>TODAY'S FOOD ({entries.length})</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>Nothing logged yet.</Text>
      ) : (
        MEALS.map((m) => {
          const mealEntries = entries.filter((e) => (e.meal ?? 'snacks') === m.key);
          if (mealEntries.length === 0) return null;
          const kcal = mealEntries.reduce((n, e) => n + e.calories, 0);
          return (
            <View key={m.key} style={{ gap: spacing.xs }}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealHeaderText}>{m.label}</Text>
                <Text style={styles.mealHeaderKcal}>{kcal} kcal</Text>
              </View>
              {mealEntries.map((e) => (
                <View key={e.id} style={styles.foodRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodName}>{e.name}</Text>
                    <Text style={styles.foodMeta}>
                      {e.calories} kcal · {e.proteinG}P {e.carbsG}C {e.fatG}F
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => remove(e.id)}>
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Bar({ label, have, goal, unit }: { label: string; have: number; goal: number; unit: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((have / goal) * 100)) : 0;
  const over = have > goal && goal > 0;
  return (
    <View style={styles.barWrap}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barVal}>
          {have} / {goal} {unit}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: over ? '#F87171' : colors.primary }]} />
      </View>
    </View>
  );
}

function NumRow({ label, value, onChange, unit }: { label: string; value: string; onChange: (v: string) => void; unit: string }) {
  return (
    <View style={styles.numRow}>
      <Text style={styles.numLabel}>{label}</Text>
      <TextInput
        style={styles.numInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
      />
      <Text style={styles.numUnit}>{unit}</Text>
    </View>
  );
}

function MiniInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.mini}>
      <TextInput
        style={styles.miniInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12 },
  edit: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  barWrap: { gap: 4, marginTop: spacing.xs },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  barVal: { color: colors.textMuted, fontSize: 13 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numLabel: { color: colors.textMuted, fontSize: 14, width: 80 },
  numInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
    textAlign: 'right',
  },
  numUnit: { color: colors.textMuted, fontSize: 13, width: 36 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mealChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  mealChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  mealChipTextOn: { color: colors.primaryDark },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  mealHeaderText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  mealHeaderKcal: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  mini: { flex: 1, alignItems: 'center', gap: 2 },
  miniInput: {
    width: '100%',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
  },
  miniLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  btnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  section: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  foodName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  foodMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  remove: { color: colors.textMuted, fontSize: 13 },
});
