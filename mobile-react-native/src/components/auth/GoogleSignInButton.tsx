import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useGoogleAuth } from 'hooks/useGoogleAuth';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  label?: string;
  onSuccess?: () => void;
}

const GoogleSignInButton = ({
  label = 'Continue with Google',
  onSuccess,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isAvailable, isBusy, signIn } = useGoogleAuth(onSuccess);

  if (!isAvailable) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>

      <Pressable
        onPress={signIn}
        disabled={isBusy}
        accessibilityRole='button'
        accessibilityLabel={label}
        accessibilityState={{ busy: isBusy, disabled: isBusy }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          isBusy && styles.busy,
        ]}
      >
        {isBusy ? (
          <ActivityIndicator size='small' color={colors.text} />
        ) : (
          <Ionicons name='logo-google' size={18} color={colors.text} />
        )}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.lg },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    divider: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: {
      ...typography.caption,
      color: colors.textSubtle,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: 54,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pressed: { opacity: 0.9 },
    busy: { opacity: 0.7 },
    label: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text,
    },
  });

export default memo(GoogleSignInButton);
