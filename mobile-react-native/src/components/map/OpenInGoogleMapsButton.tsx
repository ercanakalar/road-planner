import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import useOpenInGoogleMaps from 'hooks/routes/useOpenInGoogleMaps';

import {
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { RouteCoordinate } from 'types/map-screen-type';
import { TransportMode } from 'types/transport-type';

interface Props {
  /** The stops in travelling order, exactly as the list shows them. */
  waypoints: readonly RouteCoordinate[];
  mode: TransportMode;
}

const OpenInGoogleMapsButton = ({ waypoints, mode }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const openInGoogleMaps = useOpenInGoogleMaps();

  const handlePress = useCallback(
    () => openInGoogleMaps(waypoints, mode),
    [mode, openInGoogleMaps, waypoints],
  );

  if (waypoints.length === 0) return null;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole='button'
      accessibilityLabel='Continue this route in Google Maps'
    >
      <View style={styles.icon}>
        <Ionicons name='navigate' size={15} color={colors.primary} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.label}>Continue in Google Maps</Text>
        <Text style={styles.hint}>
          {waypoints.length === 1
            ? 'Navigate to this stop'
            : `Navigate all ${waypoints.length} stops`}
        </Text>
      </View>

      <Ionicons name='open-outline' size={16} color={colors.textSubtle} />
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    pressed: { backgroundColor: colors.primarySoft },
    icon: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    copy: { flex: 1 },
    label: {
      ...typography.label,
      color: colors.text,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textMuted,
    },
  });

export default memo(OpenInGoogleMapsButton);
