import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../../theme/colors';

/** Small uppercase section label — "YOUR PROGRESS", "TODAY'S PLAN", etc. */
export default function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.textMuted,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
  },
});
