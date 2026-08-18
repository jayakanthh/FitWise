import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme/colors';

interface TypographyProps extends TextProps {
  variant?: keyof typeof typography | 'subtitle' | 'captionSmall';
  color?: string;
  weight?: 'normal' | '500' | '600' | '700' | '800' | '900';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = colors.text,
  weight,
  align = 'left',
  style,
  children,
  ...rest
}) => {
  let baseStyle: any = typography[variant as keyof typeof typography] || typography.body;
  
  if (variant === 'subtitle') {
    baseStyle = { fontSize: 16, fontWeight: '600' };
  } else if (variant === 'captionSmall') {
    baseStyle = { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' };
  }

  return (
    <Text
      style={[
        baseStyle,
        { color, textAlign: align },
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
