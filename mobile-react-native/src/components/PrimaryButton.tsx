import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from 'theme';

interface Props {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

const PrimaryButton = ({
  label,
  onPress,
  isLoading,
  disabled,
  variant = 'primary',
  style,
}: Props) => {
  const isInactive = disabled || isLoading;
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole='button'
      accessibilityState={{ disabled: !!isInactive, busy: !!isLoading }}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondary,
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

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  disabled: { backgroundColor: colors.borderStrong },
  label: {
    ...typography.body,
    color: colors.textInverse,
  },
  labelSecondary: { color: colors.primary },
});

export default memo(PrimaryButton);
