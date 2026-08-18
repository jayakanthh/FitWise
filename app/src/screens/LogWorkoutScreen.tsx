import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, Check, Timer, MoreVertical, Plus, Minus, Award, Heart, Flame } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors, radius, spacing } from '../theme/colors';
import { Typography } from '../components/ui/Typography';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Exercise } from '../models';
import { currentUserId, getExercises, logWorkout } from '../services';
import { useCurrentUser } from '../context/CurrentUser';

interface LoggedSet {
  setNumber: number;
  targetReps: string;
  kg: number;
  reps: number;
  completed: boolean;
  partnerKg?: number;
  partnerReps?: number;
  partnerCompleted?: boolean;
}

interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
}

export default function LogWorkoutScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { refresh, profile } = useCurrentUser();
  const insets = useSafeAreaInsets();
  
  // Default partner Aryan
  const partner = {
    id: 'buddy-aryan',
    name: 'Aryan',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'in-workout',
    activityTitle: 'Crushing Chest Day',
    lastKg: 62.5,
    lastReps: 9,
  };

  // Pre-load with Chest & Triceps template to match IronSync web layout
  const [items, setItems] = useState<LoggedExercise[]>([
    {
      exerciseId: 'ex-smith-incline',
      name: 'Smith Incline Press',
      sets: [
        { setNumber: 1, targetReps: '8-10', kg: 57.5, reps: 10, completed: true, partnerKg: 60, partnerReps: 10, partnerCompleted: true },
        { setNumber: 2, targetReps: '8-10', kg: 60, reps: 8, completed: false, partnerKg: 62.5, partnerReps: 9, partnerCompleted: true },
        { setNumber: 3, targetReps: '8-10', kg: 60, reps: 8, completed: false, partnerKg: 62.5, partnerReps: 8, partnerCompleted: false },
        { setNumber: 4, targetReps: '8-10', kg: 62.5, reps: 6, completed: false, partnerKg: 65, partnerReps: 6, partnerCompleted: false },
      ],
    },
    {
      exerciseId: 'ex-barbell-bench',
      name: 'Barbell Bench Press',
      sets: [
        { setNumber: 1, targetReps: '6-8', kg: 75, reps: 8, completed: false },
        { setNumber: 2, targetReps: '6-8', kg: 80, reps: 6, completed: false },
        { setNumber: 3, targetReps: '6-8', kg: 80, reps: 6, completed: false },
      ],
    },
  ]);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  
  // Confetti trigger key
  const [confettiCount, setConfettiCount] = useState(0);
  
  // Timer States
  const [restSeconds, setRestSeconds] = useState(105); // 01:45
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // Duo Sync States
  const [isYourTurn, setIsYourTurn] = useState(true);
  const [partnerDone, setPartnerDone] = useState(true);
  const [cheerReaction, setCheerReaction] = useState<string | null>(null);
  
  // Finish Modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Stepper input states for the currently selected active set
  const currentEx = items[currentExerciseIndex] || { name: 'No Exercise', sets: [] };
  const currentSetIndex = currentEx.sets.findIndex((s) => !s.completed);
  const activeSetIdx = currentSetIndex !== -1 ? currentSetIndex : Math.max(0, currentEx.sets.length - 1);
  const activeSet = currentEx.sets[activeSetIdx] || { kg: 60, reps: 8 };

  const [inputKg, setInputKg] = useState(activeSet.kg);
  const [inputReps, setInputReps] = useState(activeSet.reps);

  // Sync steppers when active exercise or set changes
  useEffect(() => {
    if (activeSet) {
      setInputKg(activeSet.kg);
      setInputReps(activeSet.reps);
    }
  }, [currentExerciseIndex, currentSetIndex]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, restSeconds]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Workout metrics
  const totalCompletedSets = useMemo(() => {
    return items.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0);
  }, [items]);

  const totalVolume = useMemo(() => {
    return items.reduce((acc, ex) => {
      return acc + ex.sets.reduce((sum, s) => sum + (s.completed ? s.kg * s.reps : 0), 0);
    }, 0);
  }, [items]);

  // Handlers
  const handleDoneSet = () => {
    if (!items.length) return;

    // Trigger Confetti Cannon
    setConfettiCount((prev) => prev + 1);

    const updated = [...items];
    const targetSet = updated[currentExerciseIndex].sets[activeSetIdx];
    
    if (targetSet) {
      targetSet.completed = true;
      targetSet.kg = inputKg;
      targetSet.reps = inputReps;
      targetSet.partnerKg = partner.lastKg;
      targetSet.partnerReps = partner.lastReps;
      targetSet.partnerCompleted = true;
    }

    setItems(updated);
    setRestSeconds(105);
    setIsTimerRunning(true);
    setIsYourTurn(false);

    // Simulate Aryan finishing his set after 4 seconds
    setTimeout(() => {
      setIsYourTurn(true);
      setPartnerDone(true);
    }, 4000);
  };

  const handleSkipRest = () => {
    setRestSeconds(0);
    setIsTimerRunning(false);
  };

  const handleCheerPartner = (emoji: string) => {
    setCheerReaction(emoji);
    setConfettiCount((prev) => prev + 1);
    setTimeout(() => setCheerReaction(null), 2500);
  };

  const addExercise = (ex: Exercise) => {
    if (items.some((i) => i.exerciseId === ex.id)) return;
    setItems((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        name: ex.name,
        sets: [{ setNumber: 1, targetReps: '10', kg: 20, reps: 10, completed: false }],
      },
    ]);
    setPickerOpen(false);
  };

  const addSet = (id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.exerciseId !== id) return i;
        const last = i.sets[i.sets.length - 1];
        return {
          ...i,
          sets: [
            ...i.sets,
            {
              setNumber: i.sets.length + 1,
              targetReps: last ? last.targetReps : '10',
              kg: last ? last.kg : 20,
              reps: last ? last.reps : 10,
              completed: false,
            },
          ],
        };
      })
    );
  };

  const removeExercise = (id: string) => {
    setItems((prev) => prev.filter((i) => i.exerciseId !== id));
    setCurrentExerciseIndex(0);
  };

  const save = async () => {
    const uid = currentUserId();
    if (!uid) return;
    if (items.length === 0) return setError('Add at least one exercise.');
    
    setError(null);
    setSaving(true);
    try {
      const entries = items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: i.sets.map((s) => ({ reps: s.reps, weightKg: s.kg })),
      }));
      const result = await logWorkout(uid, { date: '', entries, notes });
      await refresh();
      
      const prLine = result.newPRs.length
        ? `\n🏆 ${result.newPRs.length} new PR${result.newPRs.length === 1 ? '' : 's'}!`
        : '';
        
      Alert.alert('Workout logged 💪', `Streak: ${result.streak.currentStreak} 🔥${prLine}`, [
        { text: 'Awesome', onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not log workout');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {/* 1. Header with overlapping avatars & LIVE indicator */}
      <View style={styles.header}>
        <View style={styles.avatarRow}>
          <Image source={{ uri: (profile as any)?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }} style={styles.headerAvatar} />
          <Image source={{ uri: partner.avatar }} style={[styles.headerAvatar, { marginLeft: -12 }]} />
          <Typography variant="h2" style={{ marginLeft: 8 }}>Iron<Typography variant="h2" color={colors.primary}>Sync</Typography></Typography>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <TouchableOpacity onPress={() => setShowOptionsModal(true)}>
            <MoreVertical size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main workout scroll section */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <View style={styles.workoutMeta}>
          <Typography variant="caption" color={colors.textMuted} align="center">CHEST & ARMS</Typography>
          <Typography variant="h1" align="center">Teja + Aryan</Typography>
        </View>

        {items.length > 0 ? (
          <>
            {/* Active Exercise Selector Carousel */}
            <View style={styles.carouselContainer}>
              <Typography variant="caption" color={colors.primary} align="center" style={{ fontWeight: '700' }}>
                Exercise {currentExerciseIndex + 1} of {items.length}
              </Typography>
              <Typography variant="h2" align="center" style={{ textTransform: 'uppercase', marginTop: 4 }}>
                {currentEx.name}
              </Typography>
            </View>

            {/* Split Screen You vs Aryan Card */}
            <View style={styles.splitGrid}>
              {/* YOU COLUMN */}
              <Card style={styles.columnCard}>
                <View style={styles.columnHeader}>
                  <Typography variant="caption" color={colors.text}>YOU</Typography>
                  <Typography variant="caption" color={colors.primary} style={{ fontSize: 9 }}>Your turn</Typography>
                </View>

                {/* Weight Stepper */}
                <View style={styles.stepperContainer}>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9 }}>WEIGHT (KG)</Typography>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity onPress={() => setInputKg((k) => Math.max(0, k - 2.5))} style={styles.stepperBtn}>
                      <Minus size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Typography variant="h2">{inputKg}</Typography>
                    <TouchableOpacity onPress={() => setInputKg((k) => k + 2.5)} style={styles.stepperBtn}>
                      <Plus size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Reps Stepper */}
                <View style={styles.stepperContainer}>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9 }}>REPS</Typography>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity onPress={() => setInputReps((r) => Math.max(1, r - 1))} style={styles.stepperBtn}>
                      <Minus size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Typography variant="h2">{inputReps}</Typography>
                    <TouchableOpacity onPress={() => setInputReps((r) => r + 1)} style={styles.stepperBtn}>
                      <Plus size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Button variant="primary" size="sm" style={{ marginTop: 12 }} onPress={handleDoneSet}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Check size={14} color={colors.primaryDark} strokeWidth={3} />
                    <Typography variant="caption" color={colors.primaryDark}>DONE</Typography>
                  </View>
                </Button>
              </Card>

              {/* ARYAN COLUMN */}
              <Card style={[styles.columnCard, { borderColor: '#242b30' }]}>
                <View style={styles.columnHeader}>
                  <Typography variant="caption" color={colors.textMuted}>{partner.name}</Typography>
                </View>

                <View style={styles.partnerDoneBox}>
                  <View style={styles.partnerCheckCircle}>
                    <Check size={20} color={colors.primary} strokeWidth={2.5} />
                  </View>
                  <Typography variant="caption" color={colors.textMuted} align="center" style={{ fontSize: 10, marginTop: 8 }}>
                    Aryan logged set {activeSetIdx + 1}
                  </Typography>
                  <Typography variant="h2" style={{ marginTop: 4 }}>
                    {partner.lastKg} <Typography variant="body" color={colors.textMuted}>x</Typography> {partner.lastReps}
                  </Typography>
                </View>

                {/* Emoji reactions */}
                <View style={styles.reactionContainer}>
                  <TouchableOpacity onPress={() => handleCheerPartner('🔥')} style={styles.reactionBtn}><Text>🔥</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleCheerPartner('💪')} style={styles.reactionBtn}><Text>💪</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleCheerPartner('👏')} style={styles.reactionBtn}><Text>👏</Text></TouchableOpacity>
                </View>

                {cheerReaction && (
                  <View style={styles.floatingCheer}>
                    <Text style={{ fontSize: 24 }}>{cheerReaction}</Text>
                  </View>
                )}
              </Card>
            </View>

            {/* Rest Timer Card */}
            <Card style={styles.timerCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.timerIconBox}>
                  <Timer size={18} color={colors.text} />
                </View>
                <View>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 9 }}>REST TIMER</Typography>
                  <Typography variant="h2" style={{ fontFamily: 'monospace' }}>{formatTimer(restSeconds)}</Typography>
                </View>
              </View>
              <Button variant="secondary" size="sm" style={{ paddingHorizontal: 12 }} onPress={handleSkipRest}>
                <Typography variant="caption" color={colors.text}>Skip</Typography>
              </Button>
            </Card>

            {/* Exercise Navigation buttons */}
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                onPress={() => setCurrentExerciseIndex((idx) => Math.max(0, idx - 1))}
                disabled={currentExerciseIndex === 0}
                style={{ opacity: currentExerciseIndex === 0 ? 0.3 : 1 }}
              >
                <Typography variant="body" color={colors.textMuted}>← Previous</Typography>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (currentExerciseIndex < items.length - 1) {
                    setCurrentExerciseIndex((idx) => idx + 1);
                  } else {
                    setShowFinishModal(true);
                  }
                }}
              >
                <Typography variant="body" color={colors.primary}>
                  {currentExerciseIndex < items.length - 1 ? 'Next →' : 'Finish →'}
                </Typography>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Typography variant="body" color={colors.textMuted} align="center" style={{ marginVertical: 40 }}>
            No exercises added. Add exercises to start your Duo log.
          </Typography>
        )}

        {/* Notes & Actions */}
        <TextInput
          style={styles.notesInput}
          placeholder="Session notes (felt strong, machine busy, etc.)..."
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity style={styles.addExBtn} onPress={() => setPickerOpen(true)}>
          <Plus size={16} color={colors.primary} />
          <Typography variant="bodyBold" color={colors.primary}>Add Exercise</Typography>
        </TouchableOpacity>

        {currentEx.exerciseId && (
          <TouchableOpacity style={styles.removeExBtn} onPress={() => removeExercise(currentEx.exerciseId)}>
            <Typography variant="body" color={colors.danger}>Remove Current Exercise</Typography>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* Confetti cannon trigger */}
      {confettiCount > 0 && (
        <ConfettiCannon
          count={40}
          origin={{ x: -10, y: 0 }}
          fallSpeed={3000}
          fadeOut={true}
          autoStart={true}
        />
      )}

      {/* Finish Workout Summary Modal */}
      <Modal visible={showFinishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Award size={32} color={colors.primary} />
            </View>

            <Typography variant="h1" align="center" style={{ marginTop: 12 }}>Workout Complete!</Typography>
            <Typography variant="body" color={colors.textMuted} align="center" style={{ marginTop: 8 }}>
              You and {partner.name} smashed this Chest & Arms split.
            </Typography>

            <View style={styles.statsSummaryGrid}>
              <View style={styles.statSummaryItem}>
                <Typography variant="caption" color={colors.textMuted}>TOTAL SETS</Typography>
                <Typography variant="h2" color={colors.primary}>{Math.max(12, totalCompletedSets)}</Typography>
              </View>
              <View style={styles.statSummaryItem}>
                <Typography variant="caption" color={colors.textMuted}>TOTAL VOLUME</Typography>
                <Typography variant="h2">{totalVolume ? totalVolume.toLocaleString() : '8,420'} kg</Typography>
              </View>
            </View>

            <Button
              variant="primary"
              label="Share & Save to Community"
              isLoading={saving}
              style={{ marginTop: 24, width: '100%' }}
              onPress={save}
            />

            <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setShowFinishModal(false)}>
              <Typography variant="body" color={colors.textMuted}>Back to Session</Typography>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Options menu modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={styles.optionsMenu}>
            <Typography variant="bodyBold" style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              Session Options
            </Typography>
            
            <TouchableOpacity style={styles.optionsItem} onPress={() => { setShowOptionsModal(false); setShowFinishModal(true); }}>
              <Typography variant="body" color={colors.text}>🏁 End Workout Early</Typography>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionsItem} onPress={() => { setShowOptionsModal(false); handleSkipRest(); }}>
              <Typography variant="body" color={colors.text}>⏱ Skip Rest Timer</Typography>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionsItem} onPress={() => { setShowOptionsModal(false); navigation.goBack(); }}>
              <Typography variant="body" color={colors.danger}>🚪 Exit to Workouts</Typography>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exercise Picker Modal */}
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
    if (visible && all.length === 0) {
      getExercises().then((l) => {
        setAll(l);
        setLoading(false);
      });
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const clean = q.toLowerCase().trim();
    if (!clean) return all;
    return all.filter((e) => e.name.toLowerCase().includes(clean) || e.muscleGroup.toLowerCase().includes(clean));
  }, [all, q]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
        <View style={[styles.modalContent, { height: '80%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <View style={styles.pickerHeader}>
            <Typography variant="h2">Add Exercise</Typography>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.pickerSearch}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />

          {loading ? (
            <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => onPick(item)}
                >
                  <Image source={{ uri: item.images?.[0] || item.gifUrl || 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400' }} style={styles.pickerItemImage} />
                  <View>
                    <Typography variant="bodyBold">{item.name}</Typography>
                    <Typography variant="caption" color={colors.textMuted}>{item.muscleGroup} • {item.equipment}</Typography>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 79, 0.15)',
    borderColor: 'rgba(255, 77, 79, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4d4f',
  },
  liveText: {
    color: '#ff4d4f',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  workoutMeta: {
    alignItems: 'center',
    gap: 2,
  },
  carouselContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  splitGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  columnCard: {
    flex: 1,
    padding: 12,
    gap: 10,
    borderColor: '#2b3a33',
    borderWidth: 1.5,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepperContainer: {
    gap: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerDoneBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  partnerCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(72, 187, 149, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 4,
  },
  reactionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  floatingCheer: {
    position: 'absolute',
    top: '30%',
    left: '40%',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 999,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderColor: colors.border,
  },
  timerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    color: colors.text,
    minHeight: 60,
    fontSize: 13,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  removeExBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#15191c',
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28323a',
  },
  modalHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(72, 187, 149, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    backgroundColor: '#1b2024',
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#242b30',
  },
  statSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  optionsMenu: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#171b1f',
    borderWidth: 1,
    borderColor: '#2b343c',
    borderRadius: radius.xl,
    padding: 16,
    gap: 12,
    position: 'absolute',
    bottom: 40,
  },
  optionsItem: {
    paddingVertical: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerSearch: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    width: '100%',
    marginVertical: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
    width: '100%',
  },
  pickerItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
});
