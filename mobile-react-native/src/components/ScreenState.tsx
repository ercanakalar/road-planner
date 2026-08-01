import React, { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from 'theme';

type Variant = 'loading' | 'empty' | 'error';

interface Props {
  variant: Variant;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

const DEFAULT_ICON: Record<Variant, keyof typeof Ionicons.glyphMap> = {
  loading: 'time-outline',
  empty: 'map-outline',
  error: 'alert-circle-outline',
};


const ScreenState = ({
  variant,
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: Props) => (
  <View style={styles.container}>
    {variant === 'loading' ? (
      <ActivityIndicator size='large' color={colors.primary} />
    ) : (
      <View
        style={[
          styles.iconCircle,
          variant === 'error' && styles.iconCircleError,
        ]}
      >
        <Ionicons
          name={icon ?? DEFAULT_ICON[variant]}
          size={28}
          color={variant === 'error' ? colors.danger : colors.primary}
        />
      </View>
    )}

    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}

    {actionLabel && onAction ? (
      <Pressable
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        onPress={onAction}
        accessibilityRole='button'
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleError: {
    backgroundColor: colors.dangerSoft,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  action: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  actionPressed: {
    backgroundColor: colors.primaryDark,
  },
  actionText: {
    ...typography.label,
    color: colors.textInverse,
  },
});

export default memo(ScreenState);
