import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../theme/colors';
import type { Weekday } from '../models';
import { signOutUser } from '../services';
import { useCurrentUser } from '../context/CurrentUser';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GOAL_LABELS: Record<string, string> = { cut: 'Cutting', maintain: 'Maintaining', bulk: 'Bulking' };

/** Profile — shows everything collected at onboarding + streak stats, plus logout. */
export default function ProfileScreen() {
  const { profile } = useCurrentUser();

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  const initials = (profile.displayName || '?').slice(0, 1).toUpperCase();
  const days = [...(profile.trainingDays ?? [])].sort();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {/* Streak stats */}
      <View style={styles.statRow}>
        <Stat label="Current streak" value={`${profile.currentStreak} 🔥`} />
        <Stat label="Longest" value={`${profile.longestStreak}`} />
        <Stat label="Crews" value={`${profile.groupIds?.length ?? 0}`} />
      </View>

      {/* Your details (from onboarding) */}
      <Text style={styles.sectionLabel}>YOUR DETAILS</Text>
      <View style={styles.card}>
        <Row label="Goal" value={profile.goal ? GOAL_LABELS[profile.goal] : '—'} />
        <Row label="Age" value={profile.age ? `${profile.age}` : '—'} />
        <Row label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : '—'} />
        <Row label="Weight" value={profile.weightKg ? `${profile.weightKg} kg` : '—'} last />
      </View>

      {/* Training schedule */}
      <Text style={styles.sectionLabel}>TRAINING DAYS</Text>
      <View style={styles.dayRow}>
        {DAY_LABELS.map((label, i) => {
          const on = days.includes(i as Weekday);
          return (
            <View key={label} style={[styles.day, on && styles.dayOn]}>
              <Text style={[styles.dayText, on && styles.dayTextOn]}>{label}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.logout} onPress={() => signOutUser()} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.rowItem, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  content: { padding: spacing.md, gap: spacing.md },
  header: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primaryDark, fontSize: 36, fontWeight: '800' },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: spacing.xs },
  email: { color: colors.textMuted, fontSize: 14 },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.textMuted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  day: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  dayTextOn: { color: colors.primaryDark },
  logout: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#F87171', fontSize: 15, fontWeight: '700' },
});
