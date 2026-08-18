import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Award, Clock, Flame, Share2, Globe, Lock, Shield } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors, spacing, radius } from '../theme/colors';
import { Typography } from '../components/ui/Typography';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useCurrentUser } from '../context/CurrentUser';
import { getSessionSummary, saveMyWorkoutHistory, subscribeToSession } from '../services';
import type { DuoSession, SessionSummary } from '../models';

export default function DuoCompleteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { profile } = useCurrentUser();
  const { sessionId } = route.params;

  const [session, setSession] = useState<DuoSession | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToSession(sessionId, async (updated) => {
      setSession(updated);
      if (updated.state === 'complete' || updated.participants[profile?.id ?? '']?.state === 'done') {
        try {
          const sum = await getSessionSummary(updated);
          setSummary(sum);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, [sessionId, profile]);

  const handleSaveToHistory = async () => {
    if (!profile || !session || saving) return;
    setSaving(true);
    try {
      await saveMyWorkoutHistory(sessionId, profile.id, session);
      Alert.alert('Saved!', 'Workout logged successfully in your individual history.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save workout history.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = (option: 'community' | 'followers' | 'private') => {
    // Save sharing choice
    setShared(option);
    Alert.alert('Shared!', `Workout visibility set to ${option}.`);
  };

  if (loading || !summary || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.md }}>
          Summarizing training stats...
        </Typography>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ConfettiCannon count={100} origin={{ x: -10, y: 0 }} fadeOut />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Celebration Header */}
        <View style={styles.celebrationHeader}>
          <Typography variant="caption" color={colors.primary} style={{ letterSpacing: 2, fontWeight: '800' }}>
            DUO WORKOUT COMPLETE 🎉
          </Typography>
          <Typography variant="h1" style={{ fontSize: 26, textAlign: 'center', marginTop: 4 }}>
            Incredible Session!
          </Typography>
          <Typography variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
            You and your partner crushed it. Here are your final statistics.
          </Typography>
        </View>

        {/* Combined Stats Card */}
        <Card style={styles.combinedCard}>
          <Typography variant="caption" color={colors.textMuted} style={{ fontWeight: '700' }}>
            COMBINED TEAM STATS
          </Typography>
          <View style={styles.combinedGrid}>
            <View style={styles.combinedBox}>
              <Typography variant="h2" style={{ fontSize: 28, fontWeight: '800' }}>
                {summary.combinedVolumeKg} kg
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>Total Volume</Typography>
            </View>
            <View style={styles.combinedBox}>
              <Typography variant="h2" style={{ fontSize: 28, fontWeight: '800' }}>
                {summary.totalPRs}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>Team PRs 🏆</Typography>
            </View>
          </View>
        </Card>

        {/* Individual Breakdowns */}
        <Typography variant="h2" style={{ marginTop: spacing.xs }}>Participants</Typography>

        {summary.participants.map((p) => (
          <Card key={p.userId} style={styles.partCard}>
            <View style={styles.partHeader}>
              <Typography variant="bodyBold">{p.displayName}</Typography>
              <Typography variant="caption" color={colors.primary}>
                {p.durationMinutes} min active
              </Typography>
            </View>
            <View style={styles.partStatsGrid}>
              <View style={styles.partStatBox}>
                <Typography variant="bodyBold">{p.totalVolumeKg} kg</Typography>
                <Typography variant="caption" color={colors.textMuted}>Volume</Typography>
              </View>
              <View style={styles.partStatBox}>
                <Typography variant="bodyBold">{p.totalSets} sets</Typography>
                <Typography variant="caption" color={colors.textMuted}>Logged</Typography>
              </View>
              <View style={styles.partStatBox}>
                <Typography variant="bodyBold" color={colors.milestone}>+{p.newPRCount} PRs</Typography>
                <Typography variant="caption" color={colors.textMuted}>Achieved</Typography>
              </View>
            </View>
          </Card>
        ))}

        {/* Save to History Button */}
        <Button
          variant="outline"
          onPress={handleSaveToHistory}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? <ActivityIndicator size="small" color={colors.text} /> : 'Log to Personal History'}
        </Button>

        {/* Sharing Options */}
        <Card style={styles.shareCard}>
          <Typography variant="bodyBold">Share Session?</Typography>
          <Typography variant="caption" color={colors.textMuted}>
            Determine the visibility of your individual metrics from this workout.
          </Typography>

          <View style={styles.shareOptionRow}>
            <TouchableOpacity
              style={[styles.shareOpt, shared === 'community' && styles.shareOptActive]}
              onPress={() => handleShare('community')}
            >
              <Globe size={18} color={shared === 'community' ? colors.primary : colors.textMuted} />
              <Typography variant="caption" color={shared === 'community' ? colors.primary : colors.textMuted}>
                Community
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOpt, shared === 'followers' && styles.shareOptActive]}
              onPress={() => handleShare('followers')}
            >
              <Share2 size={18} color={shared === 'followers' ? colors.primary : colors.textMuted} />
              <Typography variant="caption" color={shared === 'followers' ? colors.primary : colors.textMuted}>
                Followers
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOpt, shared === 'private' && styles.shareOptActive]}
              onPress={() => handleShare('private')}
            >
              <Lock size={18} color={shared === 'private' ? colors.primary : colors.textMuted} />
              <Typography variant="caption" color={shared === 'private' ? colors.primary : colors.textMuted}>
                Keep Private
              </Typography>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Back Home */}
        <Button
          variant="primary"
          onPress={() => navigation.navigate('Home')}
          style={{ marginTop: spacing.md }}
        >
          Back to Home Screen
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  celebrationHeader: {
    alignItems: 'center',
    gap: 4,
    marginVertical: spacing.md,
  },
  combinedCard: {
    backgroundColor: 'rgba(72, 187, 149, 0.1)',
    borderColor: 'rgba(72, 187, 149, 0.25)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  combinedGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  combinedBox: {
    flex: 1,
  },
  partCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  partStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  partStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  shareCard: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  shareOptionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shareOpt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  shareOptActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(72, 187, 149, 0.05)',
  },
});
