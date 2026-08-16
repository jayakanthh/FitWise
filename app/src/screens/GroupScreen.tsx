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
import type { Group, StreakBoardEntry } from '../models';
import {
  createGroup,
  getMyGroups,
  getStreakBoard,
  joinGroup,
  leaveGroup,
} from '../services';
import { useCurrentUser } from '../context/CurrentUser';

/**
 * Real crew screen, wired to the groups backend:
 *  - no crew yet → create one or join by invite code
 *  - in a crew → show the invite code to share + the streak leaderboard
 */
export default function GroupScreen() {
  const { profile, refresh } = useCurrentUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [boards, setBoards] = useState<Record<string, StreakBoardEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupKey = (profile?.groupIds ?? []).join(',');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const mine = await getMyGroups(profile.groupIds);
    const entries = await Promise.all(
      mine.map(async (g) => [g.id, await getStreakBoard(g.id)] as const),
    );
    setGroups(mine);
    setBoards(Object.fromEntries(entries));
    setLoading(false);
  }, [profile, groupKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async () => {
    if (!profile || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createGroup(profile.id, name.trim());
      setName('');
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create crew');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!profile || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await joinGroup(profile.id, code.trim());
      if (!id) setError('No crew found for that code.');
      else {
        setCode('');
        await refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not join crew');
    } finally {
      setBusy(false);
    }
  };

  const onLeave = async (groupId: string) => {
    if (!profile) return;
    await leaveGroup(profile.id, groupId);
    await refresh();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Your Crews</Text>

      {groups.length === 0 && (
        <Text style={styles.sub}>
          No crew yet. Create one and share the code with your friends, or join theirs.
        </Text>
      )}

      {groups.map((g) => (
        <View key={g.id} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.crewName}>{g.name}</Text>
            <TouchableOpacity onPress={() => onLeave(g.id)}>
              <Text style={styles.leave}>Leave</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeLabel}>INVITE CODE</Text>
          <Text style={styles.code}>{g.inviteCode}</Text>
          <Text style={styles.members}>{g.members.length} member{g.members.length === 1 ? '' : 's'}</Text>

          <Text style={styles.boardLabel}>🔥 STREAK LEADERBOARD</Text>
          {(boards[g.id] ?? []).length === 0 ? (
            <Text style={styles.empty}>No streaks yet — log a workout to get on the board.</Text>
          ) : (
            (boards[g.id] ?? []).map((e, i) => (
              <View key={e.userId} style={styles.boardRow}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Text style={styles.boardName}>{e.displayName}</Text>
                <Text style={styles.streak}>{e.currentStreak} 🔥</Text>
              </View>
            ))
          )}
        </View>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Create */}
      <View style={styles.card}>
        <Text style={styles.actionTitle}>Create a crew</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Crew name (e.g. Gym Bros)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TouchableOpacity
            style={[styles.btn, (!name.trim() || busy) && styles.btnDisabled]}
            onPress={onCreate}
            disabled={!name.trim() || busy}
          >
            <Text style={styles.btnText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Join */}
      <View style={styles.card}>
        <Text style={styles.actionTitle}>Join with a code</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Invite code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={[styles.btn, (!code.trim() || busy) && styles.btnDisabled]}
            onPress={onJoin}
            disabled={!code.trim() || busy}
          >
            <Text style={styles.btnText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: spacing.sm },
  sub: { color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  crewName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  leave: { color: colors.textMuted, fontSize: 13 },
  codeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: spacing.sm },
  code: { color: colors.primary, fontSize: 26, fontWeight: '800', letterSpacing: 3 },
  members: { color: colors.textMuted, fontSize: 12 },
  boardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: spacing.md },
  empty: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rank: { color: colors.textMuted, width: 24, fontSize: 14, fontWeight: '700' },
  boardName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' },
  streak: { color: colors.text, fontSize: 15, fontWeight: '700' },
  actionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  error: { color: '#F87171', fontSize: 13 },
});
