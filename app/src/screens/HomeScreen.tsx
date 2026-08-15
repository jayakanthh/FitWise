import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

/**
 * Placeholder home screen so the app runs and shows the five pillars.
 * Owner: Pruthvi (UI) — replace this with the real navigation + screens.
 */
const PILLARS = [
  { emoji: '🏋️', title: 'Workouts', desc: 'Log lifts, follow plans, track PRs' },
  { emoji: '🥗', title: 'Nutrition', desc: 'Diet plan, calories & macros' },
  { emoji: '👤', title: 'Profile & Health', desc: 'Measurements & health notes' },
  { emoji: '👥', title: 'Friend Group', desc: 'PR & streak leaderboards, supplements' },
  { emoji: '🔥', title: 'Motivation', desc: 'Daily streak counter' },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>💪 FitWise</Text>
        <Text style={styles.tagline}>Train smarter. Together.</Text>

        {PILLARS.map((p) => (
          <View key={p.title} style={styles.card}>
            <Text style={styles.cardTitle}>
              {p.emoji}  {p.title}
            </Text>
            <Text style={styles.cardDesc}>{p.desc}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Scaffold ready — start building screens in src/screens/ 🚀
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl * 2 },
  logo: { color: colors.text, fontSize: 34, fontWeight: '800' },
  tagline: { color: colors.textMuted, fontSize: 16, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  cardDesc: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  footer: {
    color: colors.primary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
