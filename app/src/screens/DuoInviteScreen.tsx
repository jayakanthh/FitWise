import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Dumbbell, Clock, X, Check } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme/colors';
import { Typography } from '../components/ui/Typography';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { acceptInvite, declineInvite } from '../services';
import type { SessionInvite } from '../models';

export default function DuoInviteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const invite: SessionInvite = route.params.invite;

  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await acceptInvite(invite.id, invite);
      navigation.replace('DuoLobby', { sessionId: invite.sessionId });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not accept invitation.');
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await declineInvite(invite.id, invite);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not decline invitation.');
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.cardWrapper}>
        <Card style={styles.inviteCard}>
          <Typography variant="caption" color={colors.primary} style={styles.tag}>
            DUO WORKOUT INVITE
          </Typography>

          <Typography variant="h1" style={styles.title}>
            {invite.fromUserName} wants to train with you!
          </Typography>

          <View style={styles.workoutPreview}>
            <View style={styles.row}>
              <Dumbbell size={18} color={colors.textMuted} />
              <Typography variant="bodyBold">
                {invite.planName || 'Custom Workout'}
              </Typography>
            </View>
            <View style={styles.row}>
              <Clock size={18} color={colors.textMuted} />
              <Typography variant="body" color={colors.textMuted}>
                {invite.exerciseCount || 5} exercises • ~55 min
              </Typography>
            </View>
          </View>

          <View style={styles.btnRow}>
            <Button
              variant="outline"
              onPress={handleDecline}
              disabled={busy}
              style={[styles.btn, { borderColor: colors.danger }]}
            >
              <X size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Typography variant="bodyBold" color={colors.danger}>Decline</Typography>
            </Button>

            <Button
              variant="primary"
              onPress={handleAccept}
              disabled={busy}
              style={styles.btn}
            >
              {busy ? (
                <ActivityIndicator color={colors.primaryDark} />
              ) : (
                <>
                  <Check size={16} color={colors.primaryDark} style={{ marginRight: 6 }} />
                  Accept
                </>
              )}
            </Button>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(14, 16, 18, 0.95)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  inviteCard: {
    width: '100%',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  tag: {
    letterSpacing: 2,
    fontWeight: '800',
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  workoutPreview: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
  },
});
