import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { resolveRegion } from 'hooks/map/useInitialRegion';
import { showNotification } from 'services/notificationService';
import { radius, shadows, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { LocateButtonProps } from 'types/components/locateButton';
import { useTranslation } from 'react-i18next';

/** Keys rather than sentences: the words are chosen when one is shown. */
const UNRESOLVED_NOTICE = {
  denied: {
    header: 'toast.locationPermissionNeeded',
    message: 'toast.locationPermissionMessage',
  },
  unavailable: {
    header: 'toast.locationUnavailable',
    message: 'toast.locationUnavailableMessage',
  },
} as const;

const LocateButton = ({
  mapRef,
  style,
  zoomDelta,
  animationDuration = 500,
}: LocateButtonProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const [isLocating, setIsLocating] = useState(false);

  const handlePress = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);

    try {
      const { region, status } = await resolveRegion();

      if (status !== 'granted') {
        const notice =
          status === 'denied'
            ? UNRESOLVED_NOTICE.denied
            : UNRESOLVED_NOTICE.unavailable;

        showNotification({
          type: 'info',
          header: t(notice.header),
          message: t(notice.message),
        });
        return;
      }

      mapRef.current?.animateToRegion(
        zoomDelta === undefined
          ? region
          : { ...region, latitudeDelta: zoomDelta, longitudeDelta: zoomDelta },
        animationDuration,
      );
    } finally {
      setIsLocating(false);
    }
  }, [animationDuration, isLocating, mapRef, t, zoomDelta]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLocating}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityLabel={t('mapUi.centreOnMe')}
      accessibilityState={{ busy: isLocating, disabled: isLocating }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      {isLocating ? (
        <ActivityIndicator size='small' color={colors.primary} />
      ) : (
        <Ionicons name='locate' size={20} color={colors.primary} />
      )}
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      ...shadows.md,
    },
    pressed: { opacity: 0.85 },
  });

export default memo(LocateButton);
