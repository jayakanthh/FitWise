import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { colors } from './src/theme/colors';
import { CurrentUserProvider } from './src/context/CurrentUser';
import AuthGate from './src/components/common/AuthGate';
import RootNavigator from './src/navigation/RootNavigator';

/**
 * App entry point. SafeAreaProvider supplies insets; each SCREEN applies its own
 * top inset (via its header / SafeAreaView / useSafeAreaInsets). We deliberately
 * do NOT wrap here with SafeAreaView(top) — that double-applied the inset on top
 * of every screen's own handling, leaving a big gap. Auth/onboarding screens
 * handle their own inset too.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <CurrentUserProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <AuthGate>
            <RootNavigator />
          </AuthGate>
        </View>
      </CurrentUserProvider>
    </SafeAreaProvider>
  );
}
