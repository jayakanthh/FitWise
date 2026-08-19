import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X, Bell, Trash2, CheckCircle2, Dumbbell, UserPlus, Award } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../theme/colors';
import { useCurrentUser } from '../../context/CurrentUser';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../../services/notifications/notification';
import { getRelativeTime } from '../../utils/formatting/relativeTime';
import type { AppNotification } from '../../models/index';

export default function NotificationsModal() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { profile } = useCurrentUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const list = await getNotifications(profile.id);
      setNotifications(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [profile]);

  const handleMarkAllRead = async () => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      await markAllAsRead(profile.id);
      await load();
    } catch (e) {
      Alert.alert('Error', 'Could not mark notifications as read.');
    } finally {
      setBusy(false);
    }
  };

  const handleNotificationTap = async (item: AppNotification) => {
    if (busy) return;
    setBusy(true);
    try {
      await markAsRead(item.id);
      // Navigate to correct destination
      if (item.type === 'duo_invite' && item.data) {
        navigation.navigate('DuoStack', {
          screen: 'DuoInvite',
          params: {
            invite: {
              id: item.data.inviteId,
              sessionId: item.data.sessionId,
              fromUserName: item.fromUserName || 'Someone',
              planName: item.data.planName,
              exerciseCount: item.data.exerciseCount,
            },
          },
        });
      } else if (item.type === 'friend_request') {
        navigation.navigate('Community', { screen: 'Friends' });
      }
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'duo_invite':
        return <Dumbbell size={18} color={colors.primary} />;
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus size={18} color="#06b6d4" />;
      case 'achievement':
        return <Award size={18} color={colors.milestone} />;
      default:
        return <Bell size={18} color={colors.textMuted} />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bell size={20} color={colors.primary} />
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {notifications.some((n) => !n.read) && (
            <TouchableOpacity onPress={handleMarkAllRead} disabled={busy} style={styles.markAllBtn}>
              <CheckCircle2 size={16} color={colors.textMuted} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.itemRow, !item.read && styles.itemUnread]}
            onPress={() => handleNotificationTap(item)}
            activeOpacity={0.85}
          >
            <View style={styles.iconContainer}>{getIcon(item.type)}</View>
            <View style={styles.bodyContainer}>
              <View style={styles.row}>
                <Text style={[styles.itemTitle, !item.read && styles.titleUnread]}>
                  {item.title}
                </Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.itemBody}>{item.body}</Text>
              <Text style={styles.itemTime}>
                {getRelativeTime(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>You have no notifications right now</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  closeBtn: { padding: 4 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  markAllText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  list: { paddingBottom: 40 },
  itemRow: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  itemUnread: { backgroundColor: 'rgba(72, 187, 149, 0.03)' },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContainer: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  titleUnread: { color: colors.text, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  itemBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  itemTime: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  emptyState: { alignItems: 'center', padding: spacing.xl, marginTop: 40, gap: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});

