import { CurrentUserProvider } from './src/context/CurrentUser';
import AuthGate from './src/components/AuthGate';
import RootNavigator from './src/navigation/RootNavigator';

/**
 * App entry point. CurrentUserProvider tracks who's signed in; AuthGate shows the
 * login screen until they are, then the bottom-tab app.
 */
export default function App() {
  return (
    <CurrentUserProvider>
      <AuthGate>
        <RootNavigator />
      </AuthGate>
    </CurrentUserProvider>
  );
}
