import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  tone?: 'default' | 'danger';
  style?: ViewStyle;
}

const PrimaryButton = ({
  label,
  onPress,
  isLoading,
  disabled,
  variant = 'primary',
  tone = 'default',
  style,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const isInactive = disabled || isLoading;
  const isSecondary = variant === 'secondary';
  const isDanger = tone === 'danger' && !isSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole='button'
      accessibilityState={{ disabled: !!isInactive, busy: !!isLoading }}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        isInactive && styles.disabled,
        pressed && !isInactive && styles.pressed,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color={isSecondary ? colors.primary : colors.textInverse}
        />
      ) : (
        <Text style={[styles.label, isSecondary && styles.labelSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      minHeight: 54,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    danger: { backgroundColor: colors.danger },
    pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
    disabled: { backgroundColor: colors.borderStrong, opacity: 0.7 },
    label: {
      ...typography.body,
      fontWeight: '600',
      letterSpacing: -0.1,
      color: colors.textInverse,
    },
    labelSecondary: { color: colors.primary },
  });

export default memo(PrimaryButton);
