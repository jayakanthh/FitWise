import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, Plus, Check, X } from 'lucide-react-native';
import { colors, spacing } from '../theme/colors';
import type { Exercise, MuscleGroup, EquipmentType } from '../types/ironsync';

interface ExerciseLibraryScreenProps {
  exercises: Exercise[];
  onSelectExercise?: (exercise: Exercise) => void;
  onAddExerciseToRoutine?: (exercise: Exercise) => void;
  selectedExerciseIds?: string[];
}

const MUSCLE_GROUPS: MuscleGroup[] = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];
const EQUIPMENT_LIST: EquipmentType[] = ['All', 'Barbell', 'Dumbbell', 'Cable', 'Machine'];

/** Ported from iron-sync web (ExerciseLibraryScreen.tsx). */
export default function ExerciseLibraryScreen({
  exercises,
  onSelectExercise,
  onAddExerciseToRoutine,
  selectedExerciseIds = [],
}: ExerciseLibraryScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType>('All');
  const [activeDetail, setActiveDetail] = useState<Exercise | null>(null);

  const filtered = exercises.filter((ex) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      ex.name.toLowerCase().includes(q) ||
      ex.subMuscle.toLowerCase().includes(q) ||
      ex.equipment.toLowerCase().includes(q);
    const matchMuscle = selectedMuscle === 'All' || ex.muscleGroup === selectedMuscle;
    const matchEquipment = selectedEquipment === 'All' || ex.equipment.toLowerCase() === selectedEquipment.toLowerCase();
    return matchSearch && matchMuscle && matchEquipment;
  });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchWrap}>
          <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises"
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
          />
          {!!searchQuery && (
            <TouchableOpacity style={styles.searchClear} onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={styles.filterLabel}>MUSCLE GROUP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {MUSCLE_GROUPS.map((mg) => {
              const isActive = selectedMuscle === mg;
              return (
                <TouchableOpacity
                  key={mg}
                  onPress={() => setSelectedMuscle(mg)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{mg}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={styles.filterLabel}>EQUIPMENT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {EQUIPMENT_LIST.map((eq) => {
              const isActive = selectedEquipment === eq;
              return (
                <TouchableOpacity
                  key={eq}
                  onPress={() => setSelectedEquipment(eq)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{eq}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.xs }}>
          {filtered.map((exercise) => {
            const isSelected = selectedExerciseIds.includes(exercise.id);
            return (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => setActiveDetail(exercise)}
                activeOpacity={0.9}
              >
                <View style={styles.exerciseLeft}>
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: exercise.image }} style={styles.thumb} />
                  </View>
                  <View>
                    <Text style={styles.exName}>{exercise.name}</Text>
                    <Text style={styles.exMeta}>{exercise.subMuscle} • {exercise.equipment}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.addBtn, isSelected && styles.addBtnSelected]}
                  onPress={() => {
                    if (onAddExerciseToRoutine) onAddExerciseToRoutine(exercise);
                    else onSelectExercise?.(exercise);
                  }}
                >
                  {isSelected ? (
                    <Check size={18} color={colors.primary} strokeWidth={2.5} />
                  ) : (
                    <Plus size={18} color="#d4d4d4" />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <Text style={styles.emptyText}>No exercises found matching your criteria.</Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!activeDetail} transparent animationType="fade" onRequestClose={() => setActiveDetail(null)}>
        <View style={styles.modalOverlay}>
          {activeDetail && (
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalKicker}>{activeDetail.subMuscle} • {activeDetail.equipment}</Text>
                  <Text style={styles.modalTitle}>{activeDetail.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveDetail(null)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                <Image source={{ uri: activeDetail.image }} style={styles.modalImage} />

                <Text style={styles.modalDesc}>
                  {activeDetail.description ||
                    'High activation compound isolation movement designed for hyper-specific muscle fiber overload and strength development.'}
                </Text>

                {!!activeDetail.tips && (
                  <View style={styles.tipsBox}>
                    <Text style={styles.tipsHeader}>Form Cues:</Text>
                    {activeDetail.tips.map((tip, idx) => (
                      <Text key={idx} style={styles.tipText}>• {tip}</Text>
                    ))}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setActiveDetail(null)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalAddBtn}
                  onPress={() => {
                    onAddExerciseToRoutine?.(activeDetail);
                    setActiveDetail(null);
                  }}
                >
                  <Text style={styles.modalAddText}>Add to Routine</Text>
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
  content: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md },

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

  filterLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
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

  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#111416',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  exName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  exMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e2327',
    borderWidth: 1,
    borderColor: '#2c343a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSelected: { backgroundColor: '#1b2f27', borderColor: colors.primary },
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
  modalImage: { height: 160, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalDesc: { color: '#d4d4d4', fontSize: 12, lineHeight: 18 },
  tipsBox: { backgroundColor: '#121517', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#262626', gap: 4 },
  tipsHeader: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tipText: { color: '#d4d4d4', fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  modalCloseBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#262626', alignItems: 'center' },
  modalCloseText: { color: '#d4d4d4', fontSize: 12, fontWeight: '600' },
  modalAddBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  modalAddText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
});
