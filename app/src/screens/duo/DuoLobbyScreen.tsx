import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, User, CheckCircle2, Circle } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme/colors';
import { Typography } from '../../components/ui/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCurrentUser } from '../../context/CurrentUser';
import {
  createSession,
  inviteParticipant,
  setReady,
  startSession,
  subscribeToSession,
} from '../../services/index';
import type { DuoSession } from '../../models/index';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const TRAINING_CATEGORIES = ['Push', 'Pull', 'Legs', 'Full Body', 'Other'];

export default function DuoLobbyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { profile } = useCurrentUser();

  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId || null);
  const [session, setSession] = useState<DuoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [readyVal, setReadyVal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Creator state
  const partnerId = route.params?.partnerId;
  const partnerName = route.params?.partnerName;

  const initCreatorSession = async () => {
    if (!profile || !partnerId) return;
    try {
      const newSessionId = await createSession(profile.id, profile.displayName || 'Creator', {
        type: 'duo',
        planName: 'Duo Workout',
        exerciseIds: [],
        exerciseNames: [],
      });
      setSessionId(newSessionId);

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
      // If user selected a training category, set it on the session document for coordination
      if (selectedCategory) {
        await updateDoc(doc(db, 'duoSessions', sessionId), { planName: selectedCategory });
      }
      await startSession(sessionId, session);
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
        <Typography variant="h1">DUO SESSION</Typography>
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
            <Typography variant="caption" color={colors.primary} style={{ fontWeight: '800' }}>🟢</Typography>
            <Typography variant="caption" color={colors.primary} style={{ fontWeight: '800', fontSize: 10 }}>CONNECTED</Typography>
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

        {/* Optional Category Selector */}
        <Card style={styles.categoryCard}>
          <Typography variant="bodyBold" style={{ textAlign: 'center' }}>
            What are you training? (Optional)
          </Typography>
          <View style={styles.pillsGrid}>
            {TRAINING_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, selectedCategory === cat && styles.pillActive]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                <Typography variant="caption" color={selectedCategory === cat ? colors.primary : colors.textMuted}>
                  {cat}
                </Typography>
              </TouchableOpacity>
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
            START DUO
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
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  categoryCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(72, 187, 149, 0.15)',
    borderColor: colors.primary,
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
