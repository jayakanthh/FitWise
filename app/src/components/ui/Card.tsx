import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, border } from '../../theme/colors';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outline' | 'surfaceAlt';
}

export const Card: React.FC<CardProps> = ({ variant = 'default', style, children, ...rest }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return [styles.card, styles.elevated];
      case 'outline':
        return [styles.card, styles.outline];
      case 'surfaceAlt':
        return [styles.card, { backgroundColor: colors.surfaceAlt }];
      default:
        return [styles.card];
    }
  };

  return (
    <View style={[getVariantStyles(), style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    borderWidth: 1,
  },
});

export default Card;
