/**
 * ExercisePicker — full-featured exercise browser modal.
 *
 * Tabs: Favourites | Recent | Chest | Back | Shoulders | Arms | Forearms | Legs | Core | Cardio
 * - 2-column card grid
 * - Debounced search
 * - Favourites/Saved via AsyncStorage per-user
 * - Custom exercise creation form (in dedicated Cancelable Modal)
 * - Multi-select primary and secondary muscles
 * - Cardio tracking type support
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, spacing } from '../../theme/colors';
import { Search, X, Star, Plus, ChevronLeft, Check } from 'lucide-react-native';
import { getExercisesByMuscle, addCustomExercise, getExercisesByIds, searchExercises, getExercise } from '../../services/index';
import { currentUserId } from '../../services/index';
import type { Exercise } from '../../models/index';

// ─── Constants ─────────────────────────────────────────────────────────────────
type CategoryKey = 'favourites' | 'recent' | 'chest' | 'back' | 'shoulders' | 'arms' | 'forearms' | 'legs' | 'core' | 'cardio' | 'search';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'favourites', label: 'Favourites' },
  { key: 'recent',     label: 'Recent' },
  { key: 'chest',      label: 'Chest' },
  { key: 'back',       label: 'Back' },
  { key: 'shoulders',  label: 'Shoulders' },
  { key: 'arms',       label: 'Arms' },
  { key: 'forearms',   label: 'Forearms' },
  { key: 'legs',       label: 'Legs' },
  { key: 'core',       label: 'Core' },
  { key: 'cardio',     label: 'Cardio' },
];

const MUSCLE_CATEGORY_MAP: Record<string, string[]> = {
  chest:     ['chest', 'pectorals', 'pecs'],
  back:      ['back', 'lats', 'latissimus', 'rhomboids', 'traps', 'upper back', 'lower back'],
  shoulders: ['shoulders', 'deltoids', 'delts', 'front_delts'],
  arms:      ['biceps', 'triceps', 'bicep', 'tricep'],
  forearms:  ['forearms', 'forearm'],
  legs:      ['quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'legs'],
  core:      ['abs', 'abdominals', 'core', 'obliques'],
  cardio:    ['cardio', 'cardiovascular'],
};

const ALL_MUSCLE_GROUPS = [
  'chest', 'front_delts', 'biceps', 'forearms', 'abs', 'obliques',
  'quads', 'calves', 'traps', 'lats', 'triceps', 'lower_back',
  'glutes', 'hamstrings'
];

const EQUIPMENT_OPTIONS = [
  'barbell', 'dumbbell', 'cable', 'machine', 'kettlebell', 'bodyweight', 'other',
];

const TRACKING_TYPES = [
  { key: 'weight_reps', label: 'Weight + Reps' },
  { key: 'reps_only',   label: 'Reps Only' },
  { key: 'duration',    label: 'Duration / Timer' },
  { key: 'distance',    label: 'Distance + Duration' },
  { key: 'calories',    label: 'Duration + Calories' },
];

function getStorageKey(userId: string, type: 'favourites' | 'recent') {
  return `fitwise_ex_${type}_${userId}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export default function ExercisePicker({ visible, onClose, onSelect }: Props) {
  const userId = currentUserId() ?? '';

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('chest');
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // Custom form state
  const [customName, setCustomName] = useState('');
  const [customEquipment, setCustomEquipment] = useState('');
  const [customPrimary, setCustomPrimary] = useState<string[]>([]);
  const [customSecondary, setCustomSecondary] = useState<string[]>([]);
  const [customTracking, setCustomTracking] = useState('weight_reps');
  const [customSaving, setCustomSaving] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load stored IDs
  const loadStored = useCallback(async () => {
    try {
      const [favs, recent] = await Promise.all([
        AsyncStorage.getItem(getStorageKey(userId, 'favourites')),
        AsyncStorage.getItem(getStorageKey(userId, 'recent')),
      ]);
      setFavouriteIds(favs ? JSON.parse(favs) : []);
      setRecentIds(recent ? JSON.parse(recent) : []);
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (visible) {
      loadStored();
    }
  }, [visible, loadStored]);

  const toggleFavourite = async (exId: string) => {
    const next = favouriteIds.includes(exId)
      ? favouriteIds.filter(id => id !== exId)
      : [exId, ...favouriteIds].slice(0, 50);
    setFavouriteIds(next);
    try { await AsyncStorage.setItem(getStorageKey(userId, 'favourites'), JSON.stringify(next)); } catch {}
  };

  const recordRecent = async (exId: string) => {
    const next = [exId, ...recentIds.filter(id => id !== exId)].slice(0, 30);
    setRecentIds(next);
    try { await AsyncStorage.setItem(getStorageKey(userId, 'recent'), JSON.stringify(next)); } catch {}
  };

  const handleSelect = useCallback((ex: Exercise) => {
    recordRecent(ex.id);
    onSelect(ex);
    onClose();
  }, [onSelect, onClose]);

  // Category / search fetching
  useEffect(() => {
    if (!visible) return;
    if (query.trim()) {
      setActiveCategory('search');
      return;
    }

    async function loadCategory() {
      setLoading(true);
      setError(null);
      try {
        if (activeCategory === 'favourites') {
          if (favouriteIds.length === 0) { setExercises([]); setLoading(false); return; }
          const favs = await getExercisesByIds(favouriteIds.slice(0, 30));
          setExercises(favs);
        } else if (activeCategory === 'recent') {
          if (recentIds.length === 0) { setExercises([]); setLoading(false); return; }
          const recent = await getExercisesByIds(recentIds.slice(0, 30));
          setExercises(recent);
        } else {
          const muscles = MUSCLE_CATEGORY_MAP[activeCategory];
          if (!muscles) { setExercises([]); setLoading(false); return; }
          
          // Load all muscles belonging to this category in parallel
          const batches = await Promise.all(
            muscles.map(m => getExercisesByMuscle(m, 30))
          );
          const all = batches.flat();
          const unique = Array.from(new Map(all.map(e => [e.id, e])).values());
          unique.sort((a, b) => a.name.localeCompare(b.name));
          setExercises(unique);
        }
      } catch (e: any) {
        console.error(e);
        setError('Failed to load. Tap to retry.');
      } finally {
        setLoading(false);
      }
    }

    loadCategory();
  }, [activeCategory, visible, favouriteIds, recentIds]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setActiveCategory(prev => prev === 'search' ? 'chest' : prev); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchExercises(query.trim());
        setExercises(results);
        setError(null);
      } catch {
        setError('Search failed. Try again.');
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  const resetCreateForm = () => {
    setCustomName('');
    setCustomEquipment('');
    setCustomPrimary([]);
    setCustomSecondary([]);
    setCustomTracking('weight_reps');
  };

  const handleCancelCreate = () => {
    const hasData = customName.trim() || customEquipment || customPrimary.length > 0 || customSecondary.length > 0;
    if (hasData) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Discard this custom exercise?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setShowCreate(false);
              resetCreateForm();
            },
          },
        ]
      );
    } else {
      setShowCreate(false);
      resetCreateForm();
    }
  };

  const handleSaveCustom = async () => {
    if (!customName.trim()) return Alert.alert('Name required');
    if (customPrimary.length === 0) return Alert.alert('Select at least one primary muscle');
    setCustomSaving(true);
    try {
      const id = await addCustomExercise(userId, {
        name: customName.trim(),
        muscleGroup: customPrimary[0],
        secondaryMuscles: customSecondary,
        equipment: customEquipment || undefined,
        trackingType: customTracking,
      });
      // Load the newly created exercise
      const exDoc = await getExercise(id);
      if (exDoc) {
        await recordRecent(id);
        Alert.alert('✅ Exercise Created', `"${customName}" is now available in your library.`);
        setShowCreate(false);
        resetCreateForm();
        // Automatically select the new exercise
        handleSelect(exDoc);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save custom exercise.');
    } finally {
      setCustomSaving(false);
    }
  };

  const toggleCustomMuscle = (m: string, kind: 'primary' | 'secondary') => {
    if (kind === 'primary') {
      setCustomPrimary(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    } else {
      setCustomSecondary(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    }
  };

  const renderCard = useCallback(({ item }: { item: Exercise }) => {
    const isFav = favouriteIds.includes(item.id);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => handleSelect(item)}>
        <View style={styles.cardTop}>
          <View style={styles.cardIconBox}>
            <Text style={styles.cardIconText}>{(item.muscleGroup || '?').slice(0, 2).toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavourite(item.id)}>
            <Star size={14} color={isFav ? colors.milestone : colors.textMuted} fill={isFav ? colors.milestone : 'none'} />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{item.muscleGroup}</Text>
        {item.equipment && <Text style={styles.cardEquip} numberOfLines={1}>{item.equipment}</Text>}
        <TouchableOpacity style={styles.addBtn} onPress={() => handleSelect(item)}>
          <Plus size={14} color={colors.primary} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [favouriteIds, handleSelect]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Exercise</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Plus size={16} color={colors.primary} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Tabs (Proper horizontally scrollable non-shrinking list) */}
        {!query.trim() && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsBar}
            contentContainerStyle={styles.tabsContainer}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tabPill, activeCategory === cat.key && styles.tabPillActive]}
                onPress={() => { setQuery(''); setActiveCategory(cat.key); }}
              >
                <Text style={[styles.tabPillText, activeCategory === cat.key && styles.tabPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Exercise Grid */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <TouchableOpacity style={styles.errorBox} onPress={() => setActiveCategory(activeCategory)}>
            <Text style={styles.errorText}>{error}</Text>
          </TouchableOpacity>
        ) : exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {activeCategory === 'favourites' ? 'No favourites yet. Tap ⭐ on any exercise.' :
               activeCategory === 'recent' ? 'No recent exercises yet.' :
               'No exercises found.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            renderItem={renderCard}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Custom Exercise Creation Panel (Dedicated Cancelable Modal) */}
        {showCreate && (
          <Modal
            visible={showCreate}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCancelCreate}
          >
            <SafeAreaView style={styles.modalScreen}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={handleCancelCreate} style={styles.closeBtn}>
                  <X size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Exercise</Text>
                <TouchableOpacity style={styles.cancelBtnLink} onPress={handleCancelCreate}>
                  <Text style={styles.cancelBtnLinkText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 60 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.createTitle}>Create Custom Exercise</Text>

                  <Text style={styles.createLabel}>Exercise Name *</Text>
                  <TextInput
                    style={styles.createInput}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="e.g. Close Grip Cable Fly"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.createLabel}>Equipment</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                    {EQUIPMENT_OPTIONS.map(e => (
                      <TouchableOpacity key={e} style={[styles.chipPill, customEquipment === e && styles.chipPillActive]} onPress={() => setCustomEquipment(e)}>
                        <Text style={[styles.chipText, customEquipment === e && styles.chipTextActive]}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.createLabel}>Primary Muscles *</Text>
                  <View style={styles.muscleGrid}>
                    {ALL_MUSCLE_GROUPS.map(m => {
                      const sel = customPrimary.includes(m);
                      return (
                        <TouchableOpacity key={m} style={[styles.muscleChip, sel && styles.muscleChipActive]} onPress={() => toggleCustomMuscle(m, 'primary')}>
                          {sel && <Check size={11} color={colors.primaryDark} style={{ marginRight: 3 }} />}
                          <Text style={[styles.muscleChipText, sel && styles.muscleChipTextActive]}>
                            {m.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.createLabel}>Secondary Muscles</Text>
                  <View style={styles.muscleGrid}>
                    {ALL_MUSCLE_GROUPS.map(m => {
                      const sel = customSecondary.includes(m);
                      return (
                        <TouchableOpacity key={m} style={[styles.muscleChip, sel && styles.muscleChipSecondaryActive]} onPress={() => toggleCustomMuscle(m, 'secondary')}>
                          {sel && <Check size={11} color={colors.text} style={{ marginRight: 3 }} />}
                          <Text style={styles.muscleChipText}>
                            {m.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.createLabel}>Tracking Type</Text>
                  {TRACKING_TYPES.map(t => (
                    <TouchableOpacity key={t.key} style={[styles.trackingRow, customTracking === t.key && styles.trackingRowActive]} onPress={() => setCustomTracking(t.key)}>
                      <View style={[styles.trackingDot, customTracking === t.key && styles.trackingDotActive]} />
                      <Text style={[styles.trackingText, customTracking === t.key && { color: colors.primary }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[styles.saveCustomBtn, customSaving && { opacity: 0.6 }]}
                    onPress={handleSaveCustom}
                    disabled={customSaving}
                  >
                    {customSaving ? <ActivityIndicator size="small" color={colors.primaryDark} /> : <Text style={styles.saveCustomBtnText}>Save & Add Exercise</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  modalScreen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeBtn: { padding: spacing.xs },
  headerTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary },
  createBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  cancelBtnLink: { paddingHorizontal: 4 },
  cancelBtnLinkText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.sm, gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 11, color: colors.text, fontSize: 15 },
  tabsBar: { flexGrow: 0, marginBottom: spacing.sm },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexShrink: 0 },
  tabPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabPillText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabPillTextActive: { color: colors.primaryDark, fontWeight: '700' },
  gridContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  gridRow: { gap: spacing.sm },
  card: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIconBox: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: 'rgba(255,107,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  cardIconText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  favBtn: { padding: 4 },
  cardName: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 17 },
  cardMeta: { color: colors.primary, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  cardEquip: { color: colors.textMuted, fontSize: 10, textTransform: 'capitalize' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  addBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  errorBox: { padding: spacing.xl, alignItems: 'center' },
  errorText: { color: colors.danger, textAlign: 'center' },
  
  createTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.xs, marginTop: spacing.sm },
  createLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12 },
  createInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.text, fontSize: 15 },
  chipPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive: { color: colors.primaryDark },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  muscleChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  muscleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  muscleChipSecondaryActive: { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: colors.primary },
  muscleChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  muscleChipTextActive: { color: colors.primaryDark, fontWeight: '700' },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 4 },
  trackingRowActive: { borderColor: colors.primary },
  trackingDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border },
  trackingDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  trackingText: { color: colors.text, fontSize: 14 },
  saveCustomBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  saveCustomBtnText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
});
