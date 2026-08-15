import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { useCurrentUser } from '../context/CurrentUser';
import AuthScreen from '../screens/AuthScreen';

/**
 * Decides what the app shows: a loading splash while auth resolves, the login
 * screen when nobody's signed in, or the app (children) once authenticated.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { loading, authed } = useCurrentUser();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!authed) return <AuthScreen />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
