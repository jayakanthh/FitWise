import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { colors, spacing } from '../../theme/colors';
import { signIn, signUp } from '../../services/index';

/**
 * Login / sign-up gate. Uses the real Firebase auth service. On success the
 * CurrentUser context picks up the auth change and the app shows the tabs.
 * Owner: jaikanth (backend wiring) — styled with Pruthvi's theme.
 */
export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(email.trim(), password, name.trim() || 'Lifter');
      else await signIn(email.trim(), password);
      // CurrentUser context reacts to the auth change — nothing else to do.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>IronSync</Text>
        </View>
        <Text style={styles.tagline}>Train smarter. Together.</Text>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (
            <Text style={styles.btnText}>{mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setError(null);
            setMode(mode === 'login' ? 'signup' : 'login');
          }}
        >
          <Text style={styles.switch}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Log in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  logoImage: { width: 44, height: 44 },
  logoText: { color: colors.text, fontSize: 34, fontWeight: '800' },
  tagline: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: '#F87171', fontSize: 13, marginTop: spacing.xs },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  switch: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.md },
});
