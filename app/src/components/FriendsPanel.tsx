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
import type { FriendRequest } from '../models';
import {
  acceptRequest,
  declineRequest,
  getFriends,
  getIncomingRequests,
  removeFriend,
  sendFriendRequest,
} from '../services';
import { useCurrentUser } from '../context/CurrentUser';

/** Friends (1-to-1): add by email, accept/decline requests, see your friends. */
export default function FriendsPanel() {
  const { profile } = useCurrentUser();
  const [friends, setFriends] = useState<{ friendId: string; name: string; since: number }[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const [f, r] = await Promise.all([getFriends(profile.id), getIncomingRequests(profile.id)]);
    setFriends(f);
    setRequests(r);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const onAdd = async () => {
    if (!profile || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    const err = await sendFriendRequest({ id: profile.id, name: profile.displayName }, email);
    setBusy(false);
    if (err) setMsg({ text: err, ok: false });
    else {
      setMsg({ text: 'Request sent! 🎉', ok: true });
      setEmail('');
    }
  };

  const onAccept = async (req: FriendRequest) => {
    await acceptRequest(req);
    load();
  };
  const onDecline = async (id: string) => {
    await declineRequest(id);
    load();
  };
  const onRemove = async (friendId: string) => {
    if (!profile) return;
    await removeFriend(profile.id, friendId);
    load();
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
      {/* Add a friend */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add a friend</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="friend's email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            style={[styles.btn, (!email.trim() || busy) && styles.btnDisabled]}
            onPress={onAdd}
            disabled={!email.trim() || busy}
          >
            {busy ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={styles.btnText}>Send</Text>}
          </TouchableOpacity>
        </View>
        {msg && <Text style={[styles.msg, { color: msg.ok ? colors.primary : '#F87171' }]}>{msg.text}</Text>}
      </View>

      {/* Incoming requests */}
      {requests.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Requests</Text>
          {requests.map((r) => (
            <View key={r.id} style={styles.reqRow}>
              <Text style={styles.name}>{r.fromName}</Text>
              <View style={styles.reqActions}>
                <TouchableOpacity style={styles.accept} onPress={() => onAccept(r)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDecline(r.id)}>
                  <Text style={styles.decline}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Friends list */}
      <Text style={styles.section}>YOUR FRIENDS ({friends.length})</Text>
      {friends.length === 0 ? (
        <Text style={styles.empty}>No friends yet — add someone by their email above.</Text>
      ) : (
        friends.map((f) => (
          <View key={f.friendId} style={styles.friendRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(f.name || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={[styles.name, { flex: 1 }]}>{f.name}</Text>
            <TouchableOpacity onPress={() => onRemove(f.friendId)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
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
    minWidth: 64,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  msg: { fontSize: 13 },
  section: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  reqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  reqActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accept: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  acceptText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  decline: { color: colors.textMuted, fontSize: 13 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontSize: 18, fontWeight: '800' },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  remove: { color: colors.textMuted, fontSize: 13 },
});
