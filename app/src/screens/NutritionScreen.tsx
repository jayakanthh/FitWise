import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  Utensils, Plus, Sparkles, Flame, Droplets, Zap, Trash2,
  Bot, ChevronDown, ChevronUp, Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme/colors';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Typography } from '../components/ui/Typography';
import type { FoodLogEntry, Goal, Meal, NutritionTargets } from '../models';
import {
  currentUserId, deleteFood, getFoodLog, getNutritionTargets,
  logFood, setNutritionTargets, sumDay, todayISO,
} from '../services';
import { useCurrentUser } from '../context/CurrentUser';

// ─── Types ───────────────────────────────────────────────────────────────────
type ViewMode = 'day' | 'week' | 'month';

// ─── AI Preset Prompts ────────────────────────────────────────────────────────
const PRESET_AI_PROMPTS = [
  '300g sweet potato, 150g chicken and 2 eggs',
  '1 scoop whey protein with 300ml almond milk & 1 banana',
  '200g salmon fillet with 150g jasmine rice & broccoli',
  '4 whole eggs scramble with 2 slices sourdough toast',
];

// ─── AI Food Parser (local simulation, same logic as web) ─────────────────────
function runAIParser(text: string): Omit<FoodLogEntry, 'id'>[] {
  const t = text.toLowerCase();
  const items: Omit<FoodLogEntry, 'id'>[] = [];
  const now = Date.now();

  if (t.includes('sweet potato') || t.includes('chicken') || t.includes('egg')) {
    if (t.includes('sweet potato')) items.push({ name: 'Roasted Sweet Potato (300g)', calories: 258, proteinG: 6, carbsG: 60, fatG: 0.5, meal: 'lunch', date: todayISO(), createdAt: now });
    if (t.includes('chicken')) items.push({ name: 'Grilled Chicken Breast (150g)', calories: 247, proteinG: 46, carbsG: 0, fatG: 5.4, meal: 'lunch', date: todayISO(), createdAt: now });
    if (t.includes('egg')) items.push({ name: 'Large Whole Eggs (2 eggs)', calories: 144, proteinG: 12, carbsG: 1, fatG: 10, meal: 'lunch', date: todayISO(), createdAt: now });
  } else if (t.includes('whey') || t.includes('protein')) {
    items.push({ name: 'Whey Protein Isolate', calories: 120, proteinG: 25, carbsG: 2, fatG: 1, meal: 'snacks', date: todayISO(), createdAt: now });
    if (t.includes('banana')) items.push({ name: 'Banana (medium)', calories: 89, proteinG: 1, carbsG: 23, fatG: 0.3, meal: 'snacks', date: todayISO(), createdAt: now });
  } else if (t.includes('salmon') || t.includes('rice')) {
    items.push({ name: 'Salmon Fillet (200g)', calories: 412, proteinG: 45, carbsG: 0, fatG: 24, meal: 'dinner', date: todayISO(), createdAt: now });
    if (t.includes('rice')) items.push({ name: 'Jasmine Rice (150g)', calories: 195, proteinG: 4, carbsG: 43, fatG: 0.5, meal: 'dinner', date: todayISO(), createdAt: now });
  } else if (t.includes('scramble') || t.includes('toast') || t.includes('sourdough')) {
    items.push({ name: 'Scrambled Eggs (4 whole)', calories: 288, proteinG: 24, carbsG: 2, fatG: 20, meal: 'breakfast', date: todayISO(), createdAt: now });
    if (t.includes('toast') || t.includes('sourdough')) items.push({ name: 'Sourdough Toast (2 slices)', calories: 198, proteinG: 7, carbsG: 38, fatG: 1.5, meal: 'breakfast', date: todayISO(), createdAt: now });
  } else if (t.trim()) {
    items.push({ name: `${text.trim()} (AI estimate)`, calories: Math.max(150, Math.min(600, text.length * 6)), proteinG: 20, carbsG: 30, fatG: 10, meal: 'lunch', date: todayISO(), createdAt: now });
  }

  return items;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function suggest(goal: Goal | undefined, weightKg = 75): NutritionTargets {
  const perKg = goal === 'cut' ? 28 : goal === 'bulk' ? 38 : 33;
  const dailyCalories = Math.round(weightKg * perKg);
  const proteinG = Math.round(weightKg * 2);
  const fatG = Math.round(weightKg * 1);
  const carbsG = Math.max(0, Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4));
  return { dailyCalories, proteinG, carbsG, fatG };
}

const MEALS: { key: Meal; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snacks', label: 'Snacks & Fuel', icon: '⚡' },
];

// ─── Circular Progress SVG ────────────────────────────────────────────────────
function CircularProgress({ percent, color, size = 96, strokeWidth = 9 }: {
  percent: number; color: string; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);
  const cx = size / 2, cy = size / 2;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={cx} cy={cy} r={r} stroke={colors.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke={color} strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NutritionScreen() {
  const { profile } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [dayEntries, setDayEntries] = useState<FoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal>('lunch');
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<Meal | null>(null);

  // Manual food form state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  // Water local state
  const [waterMl, setWaterMl] = useState(0);
  const waterTarget = 2500;

  // Load data
  const loadData = useCallback(async () => {
    const uid = currentUserId();
    if (!uid) { setLoading(false); return; }

    const [t, entries] = await Promise.all([
      getNutritionTargets(uid),
      getFoodLog(uid, todayISO()),
    ]);

    const goal = (profile as any)?.goal as Goal | undefined;
    const weightKg = (profile as any)?.weightKg;
    setTargets(t ?? suggest(goal, weightKg ?? 75));
    setDayEntries(entries);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  // Computed totals
  const totals = useMemo(() => sumDay(dayEntries), [dayEntries]);
  const t = targets ?? suggest(undefined);

  const caloriePercent = Math.min(100, Math.round((totals.dailyCalories / t.dailyCalories) * 100)) || 0;
  const proteinPercent = Math.min(100, Math.round((totals.proteinG / t.proteinG) * 100)) || 0;
  const carbsPercent = Math.min(100, Math.round((totals.carbsG / t.carbsG) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((totals.fatG / t.fatG) * 100)) || 0;
  const waterPercent = Math.min(100, Math.round((waterMl / waterTarget) * 100));
  const calorieRemaining = Math.max(0, t.dailyCalories - totals.dailyCalories);

  // ── AI Log Handler ─────────────────────────────────────────────────────────
  const handleAILog = async () => {
    if (!aiPrompt.trim()) return;
    const uid = currentUserId();
    if (!uid) return;

    setIsAiProcessing(true);

    // Simulate 1.2s AI parse time
    await new Promise((res) => setTimeout(res, 1200));

    const parsed = runAIParser(aiPrompt);

    if (parsed.length === 0) {
      Alert.alert('Could not parse', 'Try describing the food more specifically, e.g. "150g chicken breast".');
      setIsAiProcessing(false);
      return;
    }

    await Promise.all(parsed.map((item) => logFood(uid, { ...item, meal: selectedMeal })));
    await loadData();
    setAiPrompt('');
    setIsAiProcessing(false);
  };

  // ── Manual Add Handler ─────────────────────────────────────────────────────
  const handleManualAdd = async () => {
    if (!manualName.trim()) return Alert.alert('Name required', 'Enter a food name.');
    const uid = currentUserId();
    if (!uid) return;

    await logFood(uid, {
      name: manualName,
      calories: parseInt(manualCal) || 0,
      proteinG: parseInt(manualProtein) || 0,
      carbsG: parseInt(manualCarbs) || 0,
      fatG: parseInt(manualFat) || 0,
      meal: selectedMeal,
      date: todayISO(),
    });
    await loadData();
    setManualName(''); setManualCal(''); setManualProtein(''); setManualCarbs(''); setManualFat('');
    setShowManualModal(false);
  };

  // ── Delete Handler ──────────────────────────────────────────────────────────
  const handleDelete = async (entryId: string) => {
    const uid = currentUserId();
    if (!uid) return;
    await deleteFood(uid, entryId);
    await loadData();
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Utensils size={18} color={colors.warning} />
          </View>
          <View>
            <Typography variant="h2">Nutrition & Macros</Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
              Smart Fuel Tracking • AI Meal Recognition
            </Typography>
          </View>
        </View>

        <TouchableOpacity style={styles.customFoodBtn} onPress={() => { setShowManualModal(true); }}>
          <Plus size={13} color="#06b6d4" />
          <Typography variant="caption" color="#06b6d4" style={{ fontSize: 10 }}>Custom</Typography>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Calorie Dial + Macro Bars ──────────────────────────────────── */}
        <Card style={styles.macroCard}>
          {/* Calorie Dial */}
          <View style={styles.calorieDialRow}>
            <View style={styles.dialWrapper}>
              <CircularProgress percent={caloriePercent} color={colors.warning} size={100} />
              <View style={styles.dialCenter}>
                <Flame size={14} color={colors.warning} />
                <Text style={styles.dialValue}>{calorieRemaining}</Text>
                <Text style={styles.dialLabel}>kcal left</Text>
              </View>
            </View>

            <View style={styles.calorieMeta}>
              <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>TODAY'S INTAKE</Typography>
              <View style={styles.calorieNumberRow}>
                <Typography variant="h1">{totals.dailyCalories}</Typography>
                <Typography variant="body" color={colors.textMuted}>/ {t.dailyCalories} kcal</Typography>
              </View>
              <Typography variant="caption" color={colors.warning} style={{ marginTop: 2, fontSize: 11 }}>
                {caloriePercent}% of daily budget
              </Typography>
            </View>
          </View>

          {/* Macro Bars */}
          <View style={styles.macroBarsRow}>
            <MacroBar label="Protein" consumed={totals.proteinG} target={t.proteinG} percent={proteinPercent} color="#06b6d4" />
            <MacroBar label="Carbs" consumed={totals.carbsG} target={t.carbsG} percent={carbsPercent} color="#eab308" />
            <MacroBar label="Fats" consumed={totals.fatG} target={t.fatG} percent={fatPercent} color="#f87171" />
          </View>

          {/* Water Row */}
          <View style={styles.waterRow}>
            <View style={styles.waterLeft}>
              <Droplets size={16} color="#3b82f6" />
              <Typography variant="bodyBold" color="#3b82f6" style={{ fontSize: 12 }}>
                {waterMl} / {waterTarget} ml
              </Typography>
              <View style={styles.waterBarWrap}>
                <View style={[styles.waterBarFill, { width: `${waterPercent}%` as any }]} />
              </View>
            </View>
            <View style={styles.waterBtns}>
              <TouchableOpacity style={styles.waterBtn} onPress={() => setWaterMl((w) => Math.min(w + 250, waterTarget))}>
                <Typography variant="caption" color="#3b82f6" style={{ fontSize: 10 }}>+250ml</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={styles.waterBtn} onPress={() => setWaterMl((w) => Math.min(w + 500, waterTarget))}>
                <Typography variant="caption" color="#3b82f6" style={{ fontSize: 10 }}>+500ml</Typography>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* ── AI Food Logger ─────────────────────────────────────────────── */}
        <Card style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiBotBox}>
              <Bot size={16} color="#06b6d4" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Typography variant="bodyBold">AI Natural Language Logger</Typography>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI Auto-Parse</Text>
                </View>
              </View>
              <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                Type what you ate in plain English
              </Typography>
            </View>

            {/* Meal Selector */}
            <TouchableOpacity style={styles.mealSelector} onPress={() => setShowMealSelector(true)}>
              <Typography variant="caption" color="#06b6d4" style={{ fontSize: 10 }}>
                {MEALS.find((m) => m.key === selectedMeal)?.icon} {selectedMeal}
              </Typography>
              <ChevronDown size={10} color="#06b6d4" />
            </TouchableOpacity>
          </View>

          <View style={styles.aiInputRow}>
            <TextInput
              style={styles.aiInput}
              placeholder='e.g. 300g sweet potato, 150g chicken and 2 eggs'
              placeholderTextColor={colors.textMuted}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.aiLogBtn, (!aiPrompt.trim() || isAiProcessing) && { opacity: 0.5 }]}
              onPress={handleAILog}
              disabled={!aiPrompt.trim() || isAiProcessing}
            >
              {isAiProcessing
                ? <ActivityIndicator size="small" color={colors.bg} />
                : <Sparkles size={14} color={colors.bg} />
              }
              <Typography variant="caption" color={colors.bg} style={{ fontSize: 9, marginTop: 2 }}>
                {isAiProcessing ? 'Parsing...' : 'Log Meal'}
              </Typography>
            </TouchableOpacity>
          </View>

          {/* Quick Prompt Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptPillScroll}>
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9, marginRight: 6, alignSelf: 'center' }}>Try: </Typography>
            {PRESET_AI_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity key={idx} style={styles.promptPill} onPress={() => setAiPrompt(prompt)}>
                <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }} numberOfLines={1}>"{prompt.slice(0, 35)}..."</Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        {/* ── Meal Sections ─────────────────────────────────────────────── */}
        {MEALS.map((meal) => {
          const mealItems = dayEntries.filter((e) => e.meal === meal.key);
          const mealCal = mealItems.reduce((acc, i) => acc + i.calories, 0);
          const mealProtein = mealItems.reduce((acc, i) => acc + i.proteinG, 0);
          const isExpanded = expandedMeal === meal.key;

          return (
            <Card key={meal.key} style={styles.mealCard}>
              <TouchableOpacity
                style={styles.mealHeader}
                onPress={() => setExpandedMeal(isExpanded ? null : meal.key)}
              >
                <View style={styles.mealHeaderLeft}>
                  <Text style={styles.mealIcon}>{meal.icon}</Text>
                  <View>
                    <Typography variant="bodyBold">{meal.label}</Typography>
                    <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                      {mealCal} kcal • {mealProtein.toFixed(0)}g protein
                    </Typography>
                  </View>
                </View>

                <View style={styles.mealHeaderRight}>
                  <TouchableOpacity style={styles.quickAddCalBtn} onPress={() => {
                    const uid = currentUserId();
                    if (uid) logFood(uid, { name: 'Quick Add (250 kcal)', calories: 250, proteinG: 20, carbsG: 30, fatG: 5, meal: meal.key, date: todayISO() }).then(loadData);
                  }}>
                    <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9 }}>+250 kcal</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addToBtnOrange} onPress={() => { setSelectedMeal(meal.key); setShowManualModal(true); }}>
                    <Plus size={14} color={colors.warning} />
                  </TouchableOpacity>
                  {isExpanded ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.mealItemList}>
                  {mealItems.length === 0 ? (
                    <Typography variant="caption" color={colors.textMuted} style={{ fontStyle: 'italic', paddingVertical: 8 }}>
                      No foods logged for {meal.label} yet.
                    </Typography>
                  ) : (
                    mealItems.map((item) => (
                      <View key={item.id} style={styles.foodItem}>
                        <View style={styles.foodItemLeft}>
                          <Typography variant="bodyBold" style={{ fontSize: 12 }}>{item.name}</Typography>
                          <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                            {item.carbsG ? `${item.carbsG}C` : ''} • {item.proteinG}P • {item.fatG}F
                          </Typography>
                        </View>
                        <View style={styles.foodItemRight}>
                          <Typography variant="bodyBold" style={{ fontSize: 13 }}>{item.calories} kcal</Typography>
                          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                            <Trash2 size={13} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* ── Meal Selector Modal ──────────────────────────────────────────── */}
      <Modal visible={showMealSelector} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowMealSelector(false)}>
          <View style={styles.selectorMenu}>
            <Typography variant="caption" color={colors.textMuted} style={{ marginBottom: 8 }}>LOG TO MEAL</Typography>
            {MEALS.map((m) => (
              <TouchableOpacity key={m.key} style={styles.selectorItem} onPress={() => { setSelectedMeal(m.key); setShowMealSelector(false); }}>
                <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                <Typography variant="bodyBold">{m.label}</Typography>
                {selectedMeal === m.key && <Check size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Manual Food Add Modal ────────────────────────────────────────── */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.manualModal}>
            <View style={styles.manualModalHeader}>
              <Typography variant="h2">Add Custom Food</Typography>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <Typography variant="body" color={colors.textMuted}>Cancel</Typography>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.manualInput} placeholder="Food name *" placeholderTextColor={colors.textMuted} value={manualName} onChangeText={setManualName} />

            <View style={styles.manualMacroGrid}>
              <View style={styles.manualMacroCell}>
                <Typography variant="caption" color={colors.warning} style={{ fontSize: 10 }}>CALORIES</Typography>
                <TextInput style={styles.manualMacroInput} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={manualCal} onChangeText={setManualCal} />
              </View>
              <View style={styles.manualMacroCell}>
                <Typography variant="caption" color="#06b6d4" style={{ fontSize: 10 }}>PROTEIN (g)</Typography>
                <TextInput style={styles.manualMacroInput} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={manualProtein} onChangeText={setManualProtein} />
              </View>
              <View style={styles.manualMacroCell}>
                <Typography variant="caption" color="#eab308" style={{ fontSize: 10 }}>CARBS (g)</Typography>
                <TextInput style={styles.manualMacroInput} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={manualCarbs} onChangeText={setManualCarbs} />
              </View>
              <View style={styles.manualMacroCell}>
                <Typography variant="caption" color="#f87171" style={{ fontSize: 10 }}>FATS (g)</Typography>
                <TextInput style={styles.manualMacroInput} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={manualFat} onChangeText={setManualFat} />
              </View>
            </View>

            <Button variant="primary" label="Save Food" onPress={handleManualAdd} style={{ marginTop: 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── MacroBar Component ───────────────────────────────────────────────────────
function MacroBar({ label, consumed, target, percent, color }: {
  label: string; consumed: number; target: number; percent: number; color: string;
}) {
  return (
    <View style={macroBarStyles.container}>
      <View style={macroBarStyles.labelRow}>
        <Typography variant="caption" style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Typography>
        <Typography variant="caption" color={colors.text} style={{ fontSize: 10 }}>
          {consumed}/{target}g
        </Typography>
      </View>
      <View style={macroBarStyles.track}>
        <View style={[macroBarStyles.fill, { width: `${percent}%` as any, backgroundColor: color }]} />
      </View>
      <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9, marginTop: 2 }}>
        {percent}% target
      </Typography>
    </View>
  );
}

const macroBarStyles = StyleSheet.create({
  container: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  customFoodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceAlt, borderColor: colors.border,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
  },

  content: { padding: 16, gap: 16, paddingBottom: 100 },

  // Macro Card
  macroCard: { gap: 16 },
  calorieDialRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dialWrapper: { position: 'relative', width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  dialCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  dialValue: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  dialLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  calorieMeta: { flex: 1, gap: 4 },
  calorieNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  macroBarsRow: { flexDirection: 'row', gap: 8 },
  waterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  waterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  waterBarWrap: { flex: 1, height: 4, backgroundColor: colors.surfaceAlt, borderRadius: 2, overflow: 'hidden', marginLeft: 4 },
  waterBarFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  waterBtns: { flexDirection: 'row', gap: 6 },
  waterBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md,
  },

  // AI Card
  aiCard: { borderColor: 'rgba(6, 182, 212, 0.3)', gap: 10 },
  aiCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aiBotBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)', alignItems: 'center', justifyContent: 'center',
  },
  aiBadge: {
    backgroundColor: '#06b6d4', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: { color: colors.bg, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  mealSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)',
    borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.md,
  },
  aiInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiInput: {
    flex: 1, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 12,
  },
  aiLogBtn: {
    backgroundColor: '#06b6d4', borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  promptPillScroll: { flexGrow: 0 },
  promptPill: {
    backgroundColor: colors.surfaceAlt, borderColor: colors.border,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill, marginRight: 8,
  },

  // Meal Cards
  mealCard: { padding: 0, overflow: 'hidden' },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealIcon: { fontSize: 20 },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickAddCalBtn: {
    backgroundColor: colors.surfaceAlt, borderColor: colors.border,
    borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md,
  },
  addToBtnOrange: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.3)',
    borderWidth: 1, padding: 6, borderRadius: radius.md,
  },
  mealItemList: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 8, paddingTop: 8,
  },
  foodItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt, padding: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  foodItemLeft: { flex: 1, gap: 2 },
  foodItemRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteBtn: { padding: 4 },

  // Modals
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end', padding: 16,
  },
  selectorMenu: {
    backgroundColor: '#171b1f', borderRadius: radius.xl,
    padding: 16, borderWidth: 1, borderColor: '#262c32',
    marginBottom: 16, gap: 4,
  },
  selectorItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  manualModal: {
    backgroundColor: '#15191c', borderRadius: radius.xl,
    padding: 20, borderWidth: 1, borderColor: '#28323a',
    marginBottom: 16,
  },
  manualModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  manualInput: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 14, marginBottom: 12,
  },
  manualMacroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  manualMacroCell: { width: '47%' },
  manualMacroInput: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8,
    color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4,
  },
});