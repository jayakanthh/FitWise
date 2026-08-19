import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, Bookmark, Check, Plus, Play, X } from 'lucide-react-native';
import { colors, spacing } from '../../theme/colors';
import type { Routine } from '../../types/ironsync';

interface RoutineLibraryScreenProps {
  routines: Routine[];
  onStartRoutine: (routine: Routine) => void;
  onSaveRoutineToggle: (routineId: string) => void;
  onCreateRoutineClick: () => void;
  currentUserName?: string; // whose routines count as "My Routines"
}

const TABS: ('My Routines' | 'Public Library' | 'Saved')[] = ['My Routines', 'Public Library', 'Saved'];
const FILTER_CHIPS = ['All', 'Strength', 'Hypertrophy', 'Beginner', 'Advanced'];

/** Ported from iron-sync web (RoutineLibraryScreen.tsx). */
export default function RoutineLibraryScreen({
  routines,
  onStartRoutine,
  onSaveRoutineToggle,
  onCreateRoutineClick,
  currentUserName,
}: RoutineLibraryScreenProps) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Public Library');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewRoutine, setPreviewRoutine] = useState<Routine | null>(null);

  const filteredRoutines = routines.filter((r) => {
    if (activeTab === 'My Routines' && r.creator !== (currentUserName ?? '___none___')) return false;
    if (activeTab === 'Public Library' && !r.isPublic) return false;
    if (activeTab === 'Saved' && !r.isSaved) return false;
    if (selectedFilter !== 'All' && r.category !== selectedFilter) return false;
    if (
      searchQuery &&
      !r.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.creator.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Routine Library</Text>
          <TouchableOpacity style={styles.createBtn} onPress={onCreateRoutineClick} activeOpacity={0.85}>
            <Plus size={16} color={colors.primary} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search routines, splits, or creators"
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
          />
          {!!searchQuery && (
            <TouchableOpacity style={styles.searchClear} onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabBtn}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                {isActive && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {FILTER_CHIPS.map((chip) => {
            const isActive = selectedFilter === chip;
            return (
              <TouchableOpacity
                key={chip}
                onPress={() => setSelectedFilter(chip)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ gap: spacing.sm }}>
          {filteredRoutines.map((routine) => (
            <TouchableOpacity
              key={routine.id}
              style={styles.card}
              onPress={() => setPreviewRoutine(routine)}
              activeOpacity={0.9}
            >
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{routine.name}</Text>
                  <Text style={styles.cardCreator}>By {routine.creator}</Text>
                </View>
                <Text style={styles.daysTag}>{routine.daysPerWeek} DAYS/WEEK</Text>
              </View>

              <View style={styles.cardBottomRow}>
                <View style={styles.savesRow}>
                  <Bookmark size={13} color={colors.textMuted} />
                  <Text style={styles.savesText}>
                    {routine.saves >= 1000 ? `${(routine.saves / 1000).toFixed(1)}k` : routine.saves} saves
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.saveBtn, routine.isSaved && styles.saveBtnSaved]}
                    onPress={() => onSaveRoutineToggle(routine.id)}
                  >
                    {routine.isSaved ? (
                      <>
                        <Check size={13} color={colors.primary} strokeWidth={3} />
                        <Text style={styles.saveBtnTextSaved}>Saved</Text>
                      </>
                    ) : (
                      <>
                        <Plus size={13} color={colors.primaryDark} strokeWidth={3} />
                        <Text style={styles.saveBtnText}>Save</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.playBtn} onPress={() => onStartRoutine(routine)}>
                    <Play size={13} color={colors.textMuted} fill={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredRoutines.length === 0 && (
            <Text style={styles.emptyText}>No routines found in this section.</Text>
          )}
        </View>
      </ScrollView>

      {/* Routine Detail / Preview Modal */}
      <Modal visible={!!previewRoutine} transparent animationType="fade" onRequestClose={() => setPreviewRoutine(null)}>
        <View style={styles.modalOverlay}>
          {previewRoutine && (
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalKicker}>
                    {previewRoutine.category} Split • {previewRoutine.daysPerWeek} Days/Wk
                  </Text>
                  <Text style={styles.modalTitle}>{previewRoutine.name}</Text>
                  <Text style={styles.modalCreator}>Created by {previewRoutine.creator}</Text>
                </View>
                <TouchableOpacity onPress={() => setPreviewRoutine(null)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDesc}>
                {previewRoutine.description ||
                  'Optimized hypertrophic workload structured for balanced recovery and maximum progressive overload.'}
              </Text>

              <ScrollView style={{ maxHeight: 192 }}>
                <Text style={styles.modalExercisesHeader}>
                  Included Exercises ({previewRoutine.exercises.length}):
                </Text>
                {previewRoutine.exercises.map((ex, i) => (
                  <View key={i} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseSets}>{ex.sets} sets × {ex.reps}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewRoutine(null)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalStartBtn}
                  onPress={() => {
                    const r = previewRoutine;
                    setPreviewRoutine(null);
                    onStartRoutine(r);
                  }}
                >
                  <Play size={14} color={colors.primaryDark} fill={colors.primaryDark} />
                  <Text style={styles.modalStartText}>Start Routine</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: colors.text, fontSize: 22, fontWeight: '800' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  searchWrap: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: 40,
    paddingRight: 36,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.text,
  },
  searchClear: { position: 'absolute', right: 14 },

  tabRow: { flexDirection: 'row', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { paddingBottom: 10 },
  tabText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.text, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.primary, borderRadius: 2 },

  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: '#d4d4d4', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.primaryDark },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardCreator: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  daysTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    backgroundColor: '#131618',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#21262b',
  },
  savesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savesText: { color: colors.textMuted, fontSize: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  saveBtnSaved: { backgroundColor: '#1b2b24', borderWidth: 1, borderColor: colors.primary },
  saveBtnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  saveBtnTextSaved: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'center', paddingVertical: 48, color: '#6b7280', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 24,
    backgroundColor: '#171b1f',
    borderWidth: 1,
    borderColor: '#2b343c',
    padding: spacing.md,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  modalKicker: { color: colors.primary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  modalCreator: { color: colors.textMuted, fontSize: 12 },
  modalDesc: { color: '#d4d4d4', fontSize: 12 },
  modalExercisesHeader: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.xs },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#121517',
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: spacing.xs,
  },
  exerciseName: { color: '#e5e5e5', fontSize: 12, fontWeight: '600' },
  exerciseSets: { color: colors.primary, fontSize: 11 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  modalCloseBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#262626',
    alignItems: 'center',
  },
  modalCloseText: { color: '#d4d4d4', fontSize: 12, fontWeight: '600' },
  modalStartBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStartText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
});
