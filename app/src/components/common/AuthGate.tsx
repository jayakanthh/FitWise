import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { useCurrentUser } from '../../context/CurrentUser';
import AuthScreen from '../../screens/auth/AuthScreen';
import OnboardingScreen from '../../screens/auth/OnboardingScreen';
import CreateUsernameScreen from '../../screens/auth/CreateUsernameScreen';

/**
 * Decides what the app shows:
 *  - loading splash while auth resolves
 *  - login screen when nobody's signed in
 *  - onboarding when signed in but stats/schedule aren't set yet
 *  - username registration when username is missing (both onboarding and fallback)
 *  - the app (children) once signed in AND onboarded AND username created
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
  if (!profile?.username) return <CreateUsernameScreen />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
