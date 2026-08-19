import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from './src/theme/colors';
import { CurrentUserProvider } from './src/context/CurrentUser';
import AuthGate from './src/components/common/AuthGate';
import RootNavigator from './src/navigation/RootNavigator';

/**
 * App entry point. One universal top safe-area wrap keeps every screen clear of
 * the notch/status bar (the bottom tab bar handles the bottom inset itself).
 * CurrentUserProvider tracks who's signed in; AuthGate shows login → onboarding
 * → the bottom-tab app.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <CurrentUserProvider>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
          <AuthGate>
            <RootNavigator />
          </AuthGate>
        </SafeAreaView>
      </CurrentUserProvider>
    </SafeAreaProvider>
  );
}
