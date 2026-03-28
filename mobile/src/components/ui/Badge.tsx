import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', size = 'medium', style }: BadgeProps) {
  const getBadgeStyle = (): ViewStyle[] => {
    const styles: ViewStyle[] = [badgeStyles.base];

    switch (variant) {
      case 'default':
        styles.push(badgeStyles.default);
        break;
      case 'success':
        styles.push(badgeStyles.success);
        break;
      case 'warning':
        styles.push(badgeStyles.warning);
        break;
      case 'error':
        styles.push(badgeStyles.error);
        break;
      case 'info':
        styles.push(badgeStyles.info);
        break;
    }

    switch (size) {
      case 'small':
        styles.push(badgeStyles.small);
        break;
      case 'medium':
        styles.push(badgeStyles.medium);
        break;
    }

    return styles;
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'success':
        return badgeStyles.textSuccess;
      case 'warning':
        return badgeStyles.textWarning;
      case 'error':
        return badgeStyles.textError;
      case 'info':
        return badgeStyles.textInfo;
      default:
        return badgeStyles.textDefault;
    }
  };

  return (
    <View style={[...getBadgeStyle(), style]}>
      <Text style={[badgeStyles.text, getTextStyle()]}>{children}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: '#F3F4F6',
  },
  success: {
    backgroundColor: '#DCFCE7',
  },
  warning: {
    backgroundColor: '#FEF3C7',
  },
  error: {
    backgroundColor: '#FEE2E2',
  },
  info: {
    backgroundColor: '#DBEAFE',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  textDefault: {
    color: '#6B7280',
  },
  textSuccess: {
    color: '#166534',
  },
  textWarning: {
    color: '#92400E',
  },
  textError: {
    color: '#991B1B',
  },
  textInfo: {
    color: '#1E40AF',
  },
});
