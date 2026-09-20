import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  bottom: number;
  isSaving: boolean;
  onPress: () => void;
}

const SaveRouteButton = ({ bottom, isSaving, onPress }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      disabled={isSaving}
      style={({ pressed }) => [
        styles.button,
        { bottom },
        pressed && styles.pressed,
      ]}
      accessibilityRole='button'
      accessibilityLabel={t('map.saveRouteAccessibility')}
      accessibilityState={{ disabled: isSaving, busy: isSaving }}
    >
      {isSaving ? (
        <ActivityIndicator size='small' color={colors.textInverse} />
      ) : (
        <Ionicons
          name='cloud-upload-outline'
          size={17}
          color={colors.textInverse}
        />
      )}

      <Text style={styles.label}>
        {isSaving ? t('map.savingRoute') : t('map.saveRoute')}
      </Text>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      right: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      ...shadows.md,
    },
    pressed: { opacity: 0.9 },
    label: {
      ...typography.label,
      color: colors.textInverse,
    },
  });

export default memo(SaveRouteButton);
