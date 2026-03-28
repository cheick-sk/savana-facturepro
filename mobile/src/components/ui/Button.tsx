import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle[] => {
    const styles: ViewStyle[] = [buttonStyles.base];

    // Variant styles
    switch (variant) {
      case 'primary':
        styles.push(buttonStyles.primary);
        break;
      case 'secondary':
        styles.push(buttonStyles.secondary);
        break;
      case 'outline':
        styles.push(buttonStyles.outline);
        break;
      case 'ghost':
        styles.push(buttonStyles.ghost);
        break;
    }

    // Size styles
    switch (size) {
      case 'small':
        styles.push(buttonStyles.small);
        break;
      case 'medium':
        styles.push(buttonStyles.medium);
        break;
      case 'large':
        styles.push(buttonStyles.large);
        break;
    }

    if (fullWidth) styles.push(buttonStyles.fullWidth);
    if (disabled || loading) styles.push(buttonStyles.disabled);

    return styles;
  };

  const getTextStyle = (): TextStyle[] => {
    const styles: TextStyle[] = [buttonStyles.text];

    switch (variant) {
      case 'primary':
        styles.push(buttonStyles.textPrimary);
        break;
      case 'secondary':
        styles.push(buttonStyles.textSecondary);
        break;
      case 'outline':
        styles.push(buttonStyles.textOutline);
        break;
      case 'ghost':
        styles.push(buttonStyles.textGhost);
        break;
    }

    switch (size) {
      case 'small':
        styles.push(buttonStyles.textSmall);
        break;
      case 'medium':
        styles.push(buttonStyles.textMedium);
        break;
      case 'large':
        styles.push(buttonStyles.textLarge);
        break;
    }

    return styles;
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#3B82F6'} />
      ) : (
        <>
          {leftIcon}
          <Text style={getTextStyle()}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const buttonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  primary: {
    backgroundColor: '#3B82F6',
  },
  secondary: {
    backgroundColor: '#6B7280',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: '#3B82F6',
  },
  textGhost: {
    color: '#3B82F6',
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
});
