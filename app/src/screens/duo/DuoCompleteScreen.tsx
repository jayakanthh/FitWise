import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Award, Clock, Share2, Globe, Lock, Shield, User, ChevronLeft } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors, spacing, radius } from '../../theme/colors';
import { Typography } from '../../components/ui/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCurrentUser } from '../../context/CurrentUser';
import { getSessionSummary, saveMyWorkoutHistory, subscribeToSession, getExercisesByIds } from '../../services/index';
import type { DuoSession, SessionSummary, ParticipantSummary, Exercise } from '../../models/index';
import MuscleSilhouette, { aggregateMusclesFromExercises } from '../../components/common/MuscleSilhouette';

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
  const [exercisesCache, setExercisesCache] = useState<Record<string, Exercise>>({});

  // Dynamic layout measurements
  const windowWidth = Dimensions.get('window').width;
  const silhouetteSize = Math.floor((windowWidth - 70) / 4); // Side by side layout

  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToSession(sessionId, async (updated) => {
      setSession(updated);

      // Check if both participants are finished or if the session is complete
      const myId = profile?.id ?? '';
      const myState = updated.participants[myId]?.state;
      const isComplete = updated.state === 'complete';

      if (isComplete || myState === 'done') {
        try {
          const sum = await getSessionSummary(updated);
          setSummary(sum);
        } catch (e) {
          console.error("Error loading summary:", e);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, [sessionId, profile]);

  // Load all unique exercises used by participants to aggregate muscles correctly
  useEffect(() => {
    if (!summary) return;
    const allIds = Array.from(new Set(
      summary.participants.flatMap((p) => p.exercises?.map((e) => e.exerciseId) || [])
    ));
    if (allIds.length === 0) return;

    getExercisesByIds(allIds).then((exs) => {
      const cache: Record<string, Exercise> = {};
      exs.forEach((e) => {
        cache[e.id] = e;
      });
      setExercisesCache(cache);
    }).catch(console.error);
  }, [summary]);

  const getParticipantMuscles = (p: ParticipantSummary) => {
    const exs = (p.exercises || [])
      .map((e) => exercisesCache[e.exerciseId])
      .filter((e): e is Exercise => e !== undefined);
    return aggregateMusclesFromExercises(exs);
  };

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
    setShared(option);
    Alert.alert('Shared!', `Workout visibility set to ${option}.`);
  };

  if (loading || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.md }}>
          Summarizing training stats...
        </Typography>
      </View>
    );
  }

  const myId = profile?.id ?? '';
  const myMeta = session.participants[myId];
  const partnerId = Object.keys(session.participants).find(id => id !== myId) || '';
  const partnerMeta = session.participants[partnerId];

  // If the current user is done but the partner is still training
  if (myMeta?.state === 'done' && session.state !== 'complete') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Typography variant="h2" align="center" style={{ marginTop: spacing.md }}>
          YOU'RE DONE!
        </Typography>
        <Typography variant="body" color={colors.textMuted} align="center" style={{ marginHorizontal: 32, marginTop: 4 }}>
          Waiting for {partnerMeta?.displayName || 'your partner'} to finish...
        </Typography>
        <Button
          variant="outline"
          style={{ marginTop: spacing.lg, width: 200 }}
          onPress={() => navigation.navigate('Home')}
        >
          Go to Home
        </Button>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ConfettiCannon count={100} origin={{ x: -10, y: 0 }} fadeOut />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Typography variant="h1">DUO SUMMARY</Typography>
      </View>

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
            You and your partner crushed it together.
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
                {summary.combinedVolumeKg.toLocaleString()} kg
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

        {/* Side-by-Side Participant Breakdowns */}
        <Typography variant="h2" style={{ marginTop: spacing.xs }}>Participants</Typography>

        <View style={styles.sideBySideRow}>
          {summary.participants.map((p) => {
            const muscles = getParticipantMuscles(p);
            return (
              <Card key={p.userId} style={styles.participantCardSide}>
                <Typography variant="bodyBold" numberOfLines={1} align="center">
                  {p.displayName}
                </Typography>
                <Typography variant="caption" color={colors.primary} align="center" style={{ fontSize: 10 }}>
                  {p.durationMinutes} min active
                </Typography>

                <View style={styles.statBoxSide}>
                  <Typography variant="bodyBold" style={{ fontSize: 14 }}>
                    {p.totalVolumeKg.toLocaleString()} kg
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>Volume</Typography>
                </View>

                <View style={styles.statBoxSide}>
                  <Typography variant="bodyBold" style={{ fontSize: 14 }}>
                    {p.totalSets} sets
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>Logged</Typography>
                </View>

                <View style={styles.statBoxSide}>
                  <Typography variant="bodyBold" color={colors.milestone} style={{ fontSize: 14 }}>
                    +{p.newPRCount}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>PRs</Typography>
                </View>

                {/* Silhouette maps */}
                <Typography variant="caption" color={colors.textMuted} align="center" style={{ fontWeight: '800', marginTop: 6, fontSize: 8 }}>
                  MUSCLE WORK
                </Typography>
                <View style={styles.silhouetteRowSide}>
                  <MuscleSilhouette
                    primaryMuscles={muscles.primary}
                    secondaryMuscles={muscles.secondary}
                    view="front"
                    size={silhouetteSize}
                  />
                  <MuscleSilhouette
                    primaryMuscles={muscles.primary}
                    secondaryMuscles={muscles.secondary}
                    view="back"
                    size={silhouetteSize}
                  />
                </View>
              </Card>
            );
          })}
        </View>

        {/* Fallback Log to History Button */}
        <Button
          variant="outline"
          onPress={handleSaveToHistory}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? <ActivityIndicator size="small" color={colors.text} /> : 'Sync to Personal History'}
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
          style={{ marginTop: spacing.md, marginBottom: 24 }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  celebrationHeader: {
    alignItems: 'center',
    gap: 4,
    marginVertical: spacing.sm,
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
  sideBySideRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  participantCardSide: {
    flex: 1,
    padding: spacing.sm,
    gap: 4,
  },
  statBoxSide: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  silhouetteRowSide: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
    gap: 2,
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
