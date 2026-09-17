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
  /** Clear of the collapsed sheet, so it is not half-hidden behind the stops. */
  bottom: number;
  isSaving: boolean;
  onPress: () => void;
}

/**
 * Saves the route being edited, from the screen it is being edited on.
 *
 * The same thing can be done from Settings, which handles every route on the
 * device at once. That is the right home for the bulk version and the wrong
 * place to reach for after dropping a pin: two tabs and a scroll away from the
 * map. This is the one-route version, within a thumb of the work.
 */
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
      // Tall enough to be a comfortable target, since it sits over a map that
      // takes a drag on any miss.
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
