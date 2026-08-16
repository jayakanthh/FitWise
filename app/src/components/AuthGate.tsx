import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { useCurrentUser } from '../context/CurrentUser';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

/**
 * Decides what the app shows:
 *  - loading splash while auth resolves
 *  - login screen when nobody's signed in
 *  - onboarding when signed in but stats/schedule aren't set yet
 *  - the app (children) once signed in AND onboarded
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { loading, authed, profile } = useCurrentUser();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!authed) return <AuthScreen />;
  if (!profile?.onboarded) return <OnboardingScreen />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
