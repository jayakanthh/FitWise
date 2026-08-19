import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/colors';
import type { Plan } from '../../models/index';
import { createPlan, currentUserId, getPlan, setActivePlan } from '../../services/index';
import { useCurrentUser } from '../../context/CurrentUser';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Adopt a public plan → map each of MY training days to one of the plan's days
 * (or a rest day), then save it as my own private copy with my weekday labels.
 */
export default function AdoptPlanScreen({
  navigation,
  route,
}: {
  navigation: { goBack: () => void };
  route?: { params?: { planId?: string } };
}) {
  const planId = route?.params?.planId;
  const { profile, refresh } = useCurrentUser();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myDays = [...(profile?.trainingDays ?? [])].sort((a, b) => a - b);
  // weekday -> index into plan.days (or null = rest that day)
  const [mapping, setMapping] = useState<Record<number, number | null>>({});

  useEffect(() => {
    if (!planId) return;
    getPlan(planId).then((p) => {
      setPlan(p);
      if (p) {
        // Default: assign the plan's days to my days in order.
        const init: Record<number, number | null> = {};
        myDays.forEach((wd, i) => {
          init[wd] = i < p.days.length ? i : null;
        });
        setMapping(init);
      }
      setLoading(false);
    });
  }, [planId]); // eslint-disable-line react-hooks/exhaustive-deps

  const adopt = async () => {
    const uid = currentUserId();
    if (!uid || !plan) return;
    const newDays = myDays
      .filter((wd) => mapping[wd] != null)
      .map((wd) => ({
        label: DAY_LABELS[wd],
        exercises: plan.days[mapping[wd] as number].exercises,
      }));
    if (newDays.length === 0) return setError('Assign at least one day.');
    setSaving(true);
    setError(null);
    try {
      const newId = await createPlan(uid, {
        name: plan.name,
        days: newDays,
        visibility: 'private',
        authorName: profile?.displayName,
      });
      await setActivePlan(uid, newId); // follow the plan you just adopted
      await refresh();
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not adopt plan');
      setSaving(false);
    }
  };

  if (loading || !plan) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.muted}>Plan not found.</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Use this plan</Text>
        <TouchableOpacity onPress={adopt} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.save}>Adopt</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.byline}>
          by {plan.createdByName ?? 'someone'} · {plan.days.length} day{plan.days.length === 1 ? '' : 's'}
        </Text>

        <Text style={styles.section}>MAP IT TO YOUR SCHEDULE</Text>
        <Text style={styles.hint}>
          Pick which of {plan.createdByName ?? 'their'} days you'll do on each of your training days. It saves as
          your own private copy.
        </Text>

        {myDays.length === 0 ? (
          <Text style={styles.muted}>Set your training days in Profile first.</Text>
        ) : (
          myDays.map((wd) => (
            <View key={wd} style={styles.dayCard}>
              <Text style={styles.myDay}>{DAY_LABELS[wd]}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {plan.days.map((d, i) => {
                  const on = mapping[wd] === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => setMapping((m) => ({ ...m, [wd]: i }))}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {d.label} ({d.exercises.length})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.chip, mapping[wd] == null && styles.chipRest]}
                  onPress={() => setMapping((m) => ({ ...m, [wd]: null }))}
                >
                  <Text style={[styles.chipText, mapping[wd] == null && styles.chipTextOn]}>Rest</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ))
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, fontSize: 14 },
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
  content: { padding: spacing.md, gap: spacing.sm },
  planName: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  byline: { color: colors.textMuted, fontSize: 13 },
  section: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  dayCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  myDay: { color: colors.text, fontSize: 16, fontWeight: '800' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipRest: { borderColor: colors.textMuted },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: colors.primaryDark },
  error: { color: '#F87171', fontSize: 13, marginTop: spacing.sm },
});
