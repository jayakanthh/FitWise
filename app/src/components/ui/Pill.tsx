import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { colors, radius, spacing } from '../../theme/colors';

interface PillProps extends TouchableOpacityProps {
  label: string;
  active?: boolean;
}

/** Filter chip / category pill — used in Workouts, Exercise Library, Home category row. */
export default function Pill({ label, active, style, ...props }: PillProps) {
  return (
    <TouchableOpacity style={[styles.pill, active && styles.pillActive, style]} activeOpacity={0.85} {...props}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  textActive: { color: colors.primaryDark },
});
