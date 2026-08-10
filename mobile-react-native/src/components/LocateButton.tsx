import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { resolveRegion } from 'hooks/useInitialRegion';
import { showNotification } from 'services/notificationService';
import { radius, shadows, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { LocateButtonProps } from 'types/components/locateButton';

const UNRESOLVED_NOTICE = {
  denied: {
    header: 'Location permission needed',
    message: 'Allow location access to centre the map on your position.',
  },
  unavailable: {
    header: 'Location unavailable',
    message: 'Your position could not be read. Try again in a moment.',
  },
};

const LocateButton = ({
  mapRef,
  style,
  zoomDelta,
  animationDuration = 500,
}: LocateButtonProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [isLocating, setIsLocating] = useState(false);

  const handlePress = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);

    try {
      const { region, status } = await resolveRegion();

      if (status !== 'granted') {
        showNotification({
          type: 'info',
          ...(status === 'denied'
            ? UNRESOLVED_NOTICE.denied
            : UNRESOLVED_NOTICE.unavailable),
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
  }, [animationDuration, isLocating, mapRef, zoomDelta]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLocating}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityLabel='Centre the map on my location'
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
