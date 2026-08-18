import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
  inviteParticipant,
  setReady,
  startSession,
  subscribeToSession,
} from '../services';
import type { DuoSession } from '../models';

export default function DuoLobbyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { profile } = useCurrentUser();

  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId || null);
  const [session, setSession] = useState<DuoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyVal, setReadyVal] = useState(false);

  // If we came from invite flow, sessionId is passed.
  // If we came from member list, partnerId & partnerName are passed, and we need to create the session.
  const partnerId = route.params?.partnerId;
  const partnerName = route.params?.partnerName;

  const initCreatorSession = async () => {
    if (!profile || !partnerId) return;
    try {
      // Create session with default Upper Body exercises
      const newSessionId = await createSession(profile.id, profile.displayName, {
        type: 'duo',
        planName: 'Upper Body A',
        exerciseIds: ['ex-smith-incline', 'ex-barbell-bench', 'ex-lat-pulldown', 'ex-lateral-raise'],
        exerciseNames: ['Smith Incline Press', 'Barbell Bench Press', 'Lat Pulldown', 'Lateral Raise'],
      });

      // Fetch created session
      setSessionId(newSessionId);

      // Now invite the partner
      const dummySession: DuoSession = {
        id: newSessionId,
        type: 'duo',
        creatorId: profile.id,
        exerciseIds: [],
        exerciseNames: [],
        state: 'pending',
        createdAt: Date.now(),
        participants: {},
      };
      await inviteParticipant(newSessionId, dummySession, { id: partnerId, name: partnerName });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not create training session.');
      navigation.goBack();
    }
  };

  useEffect(() => {
    if (!sessionId && partnerId) {
      initCreatorSession();
    }
  }, [sessionId, partnerId]);

  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);
    const unsub = subscribeToSession(
      sessionId,
      (updated) => {
        setSession(updated);
        setLoading(false);

        // Check if workout has started, navigate to active workout screen
        if (updated.state === 'active') {
          unsub();
          navigation.replace('DuoWorkout', { sessionId });
        }
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

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
      // navigation is handled by the subscription useEffect above
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not start workout.');
    }
  };

  if (loading || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.md }}>
          Setting up lobby...
        </Typography>
      </View>
    );
  }

  const creatorId = session.creatorId;
  const partnerUid = Object.keys(session.participants).find((id) => id !== creatorId) || '';
  const partnerMeta = session.participants[partnerUid];
  const creatorMeta = session.participants[creatorId];

  const isCreator = profile?.id === creatorId;
  const bothReady = creatorMeta?.isReady && partnerMeta?.isReady;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Typography variant="h1">Duo Training Lobby</Typography>
      </View>

      <View style={styles.content}>
        {/* Connection visualization */}
        <View style={styles.lobbyVisual}>
          <Card style={styles.userBox}>
            <View style={styles.avatarCircle}>
              <User size={24} color={colors.primary} />
            </View>
            <Typography variant="bodyBold">{creatorMeta?.displayName || 'Creator'}</Typography>
            <View style={styles.readyBadge}>
              {creatorMeta?.isReady ? (
                <CheckCircle2 size={16} color={colors.primary} />
              ) : (
                <Circle size={16} color={colors.textMuted} />
              )}
              <Typography variant="caption" color={creatorMeta?.isReady ? colors.primary : colors.textMuted}>
                {creatorMeta?.isReady ? 'Ready' : 'Not Ready'}
              </Typography>
            </View>
          </Card>

          <View style={styles.connector}>
            <Typography variant="caption" color={colors.textMuted} style={{ fontWeight: '700' }}>VS</Typography>
            <View style={styles.connectorLine} />
          </View>

          <Card style={styles.userBox}>
            <View style={styles.avatarCircle}>
              <User size={24} color={colors.primary} />
            </View>
            <Typography variant="bodyBold">
              {partnerMeta?.displayName || partnerName || 'Invited Partner'}
            </Typography>
            <View style={styles.readyBadge}>
              {partnerMeta?.state === 'invited' ? (
                <Typography variant="caption" color={colors.warning}>Invited...</Typography>
              ) : partnerMeta?.isReady ? (
                <CheckCircle2 size={16} color={colors.primary} />
              ) : (
                <Circle size={16} color={colors.textMuted} />
              )}
              {partnerMeta?.state !== 'invited' && (
                <Typography variant="caption" color={partnerMeta?.isReady ? colors.primary : colors.textMuted}>
                  {partnerMeta?.isReady ? 'Ready' : 'Not Ready'}
                </Typography>
              )}
            </View>
          </Card>
        </View>

        {/* Routine detail card */}
        <Card style={styles.routineCard}>
          <View style={styles.routineTitleRow}>
            <Dumbbell size={20} color={colors.primary} />
            <Typography variant="bodyBold" style={{ fontSize: 16 }}>
              {session.planName || 'Custom Routine'}
            </Typography>
          </View>
          <View style={styles.exercisesList}>
            {session.exerciseNames.map((name, idx) => (
              <Typography key={idx} variant="caption" color={colors.textMuted}>
                {idx + 1}. {name}
              </Typography>
            ))}
          </View>
        </Card>
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <Button
          variant={readyVal ? 'ghost' : 'outline'}
          onPress={handleToggleReady}
          style={styles.actionBtn}
        >
          {readyVal ? 'Unready' : 'Ready Up'}
        </Button>

        {isCreator && (
          <Button
            variant="primary"
            onPress={handleStartWorkout}
            disabled={!bothReady}
            style={styles.actionBtn}
          >
            Start Workout
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
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  lobbyVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  userBox: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connector: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  connectorLine: {
    width: 2,
    height: 40,
    backgroundColor: colors.border,
  },
  routineCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  routineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exercisesList: {
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
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
