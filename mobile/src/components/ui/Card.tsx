import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const getCardStyle = (): ViewStyle[] => {
    const styles: ViewStyle[] = [cardStyles.base];

    switch (variant) {
      case 'default':
        styles.push(cardStyles.default);
        break;
      case 'elevated':
        styles.push(cardStyles.elevated);
        break;
      case 'outlined':
        styles.push(cardStyles.outlined);
        break;
    }

    return styles;
  };

  return <View style={[...getCardStyle(), style]}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  base: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
