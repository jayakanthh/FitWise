import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Dumbbell, User, CheckCircle2, Circle } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme/colors';
import { Typography } from '../components/ui/Typography';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useCurrentUser } from '../context/CurrentUser';
import {
  createSession,
  setReady,
  startSession,
  subscribeToSession,
} from '../services';
import type { DuoSession } from '../models';

export default function GroupWorkoutLobbyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { profile } = useCurrentUser();
  const { communityId, communityName } = route.params;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<DuoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyVal, setReadyVal] = useState(false);

  const initGroupSession = async () => {
    if (!profile) return;
    try {
      const newSessionId = await createSession(profile.id, profile.displayName, {
        type: 'group',
        planName: `${communityName || 'Group'} Workout`,
        exerciseIds: ['ex-smith-incline', 'ex-barbell-bench', 'ex-lat-pulldown'],
        exerciseNames: ['Smith Incline Press', 'Barbell Bench Press', 'Lat Pulldown'],
        communityId,
      });
      setSessionId(newSessionId);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not create group session.');
      navigation.goBack();
    }
  };

  useEffect(() => {
    initGroupSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToSession(sessionId, (updated) => {
      setSession(updated);
      setLoading(false);

      if (updated.state === 'active') {
        unsub();
        navigation.replace('GroupWorkout', { sessionId });
      }
    });
    return () => unsub();
  }, [sessionId]);

  const handleToggleReady = async () => {
    if (!profile || !sessionId) return;
    const nextVal = !readyVal;
    setReadyVal(nextVal);
    try {
      await setReady(sessionId, profile.id, nextVal);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartWorkout = async () => {
    if (!sessionId || !session) return;
    try {
      await startSession(sessionId, session);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const participants = Object.entries(session.participants);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Typography variant="h1">Group Workout Lobby</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Typography variant="h2" style={{ marginBottom: spacing.sm }}>Participants ({participants.length})</Typography>

        {participants.map(([uid, p]) => (
          <Card key={uid} style={styles.partRow}>
            <View style={styles.avatarCircle}>
              <User size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Typography variant="bodyBold">{p.displayName}</Typography>
              <Typography variant="caption" color={colors.textMuted}>
                {uid === session.creatorId ? 'Organizer' : 'Member'}
              </Typography>
            </View>
            <View style={styles.readyBadge}>
              {p.isReady ? (
                <CheckCircle2 size={16} color={colors.primary} />
              ) : (
                <Circle size={16} color={colors.textMuted} />
              )}
              <Typography variant="caption" color={p.isReady ? colors.primary : colors.textMuted}>
                {p.isReady ? 'Ready' : 'Not Ready'}
              </Typography>
            </View>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.btnRow}>
        <Button variant={readyVal ? 'ghost' : 'outline'} onPress={handleToggleReady} style={styles.actionBtn}>
          {readyVal ? 'Unready' : 'Ready Up'}
        </Button>
        {profile?.id === session.creatorId && (
          <Button variant="primary" onPress={handleStartWorkout} style={styles.actionBtn}>
            Start Squad Workout
          </Button>
        )}
      </View>
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
    gap: spacing.sm,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
