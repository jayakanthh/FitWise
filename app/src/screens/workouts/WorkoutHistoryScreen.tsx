import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dumbbell, ChevronDown, ChevronUp, Calendar, Clock, TrendingUp, Zap, ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors, spacing, radius } from "../../theme/colors";
import { useCurrentUser } from "../../context/CurrentUser";
import { getWorkoutHistory, getExercisesByIds } from "../../services/index";
import type { Workout } from "../../models/index";

function formatDuration(minutes: number) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(ts: number | string) {
  const d = new Date(typeof ts === "string" ? ts : ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WorkoutHistoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { profile } = useCurrentUser();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getWorkoutHistory(profile.id, 50);
      const uniqueIds = Array.from(new Set(list.flatMap(w => w.entries.map(e => e.exerciseId))));
      const exList = await getExercisesByIds(uniqueIds);
      const exMap: Record<string, string> = {};
      exList.forEach((e) => {
        exMap[e.id] = e.name;
      });
      setExercises(exMap);
      setWorkouts(list);
    } catch (e) {
      setError("Could not load workout history.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalVolume = (w: Workout) =>
    w.entries.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + set.weightKg * set.reps, 0), 0);

  const totalSets = (w: Workout) =>
    w.entries.reduce((sum, e) => sum + e.sets.length, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Workout History</Text>
          <Text style={styles.subtitle}>{workouts.length} sessions logged</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Dumbbell size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptySubtitle}>Complete your first workout to see it here</Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate("Workouts", { screen: "LogWorkout" })}
          >
            <Text style={styles.ctaBtnText}>Log a Workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const vol = totalVolume(item);
            const sets = totalSets(item);
            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => navigation.navigate("WorkoutDetail", { workoutId: item.id, userId: profile?.id })}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardTitle}>
                      {item.planName || "Workout Session"}
                    </Text>
                    {item.workoutType === 'duo' && item.duoPartnerName && (
                      <View style={styles.duoBadge}>
                        <Text style={styles.duoBadgeText}>🤝 Duo with {item.duoPartnerName}</Text>
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Calendar size={11} color={colors.textMuted} />
                        <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={11} color={colors.textMuted} />
                        <Text style={styles.metaText}>{formatDuration(item.durationMinutes || 0)}</Text>
                      </View>
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.statChip}>
                        <TrendingUp size={11} color={colors.primary} />
                        <Text style={styles.statChipText}>{sets} sets</Text>
                      </View>
                      <View style={styles.statChip}>
                        <Zap size={11} color={colors.primary} />
                        <Text style={styles.statChipText}>{vol.toLocaleString()} kg vol</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ justifyContent: "center" }}>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backText: { color: colors.text, fontSize: 22, fontWeight: "300" },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  errorText: { color: colors.danger, fontSize: 14, textAlign: "center" },
  retryBtn: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.pill },
  retryText: { color: colors.text, fontWeight: "700" },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  ctaBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill, marginTop: 8 },
  ctaBtnText: { color: colors.primaryDark, fontWeight: "800", fontSize: 15 },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardLeft: { flex: 1, gap: 6 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", gap: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textMuted, fontSize: 11 },
  statsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(72,187,149,0.1)",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statChipText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  exerciseName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "700" },
  exerciseSets: { color: colors.textMuted, fontSize: 11 },
  exerciseBlock: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "40",
  },
  setsList: {
    paddingLeft: 22,
    marginTop: 2,
    gap: 2,
  },
  setText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  notes: { color: colors.textMuted, fontSize: 12, fontStyle: "italic", marginTop: 8 },
  duoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  duoBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
});
