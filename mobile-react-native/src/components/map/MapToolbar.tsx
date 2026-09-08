import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  /** Distance from the top of the screen, already past the safe area. */
  top: number;
  title: string;
  /** More than one route on the device, so the name doubles as a picker. */
  canSwitch: boolean;
  hasActiveRoad: boolean;
  onSwitch: () => void;
  onEditDetails: () => void;
  onNewRoad: () => void;
  onDeleteRoad: () => void;
  onImportFromGoogleMaps: () => void;
}

/**
 * The row of chips floating over the map: which route is being edited, and the
 * three things you can do to it.
 */
const MapToolbar = ({
  top,
  title,
  canSwitch,
  hasActiveRoad,
  onSwitch,
  onEditDetails,
  onNewRoad,
  onDeleteRoad,
  onImportFromGoogleMaps,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.toolbar, { top }]}>
      <Pressable
        style={styles.roadChip}
        onPress={canSwitch ? onSwitch : onEditDetails}
        accessibilityRole='button'
        accessibilityLabel={canSwitch ? 'Switch route' : 'Edit route details'}
      >
        <Ionicons name='git-branch-outline' size={15} color={colors.primary} />
        <Text style={styles.roadChipText} numberOfLines={1}>
          {title}
        </Text>
        {canSwitch ? (
          <Ionicons name='chevron-down' size={14} color={colors.textMuted} />
        ) : null}
      </Pressable>

      <Pressable
        style={styles.iconChip}
        onPress={onNewRoad}
        accessibilityRole='button'
        accessibilityLabel='Start a new route'
      >
        <Ionicons name='add' size={18} color={colors.primary} />
      </Pressable>

      <Pressable
        style={styles.iconChip}
        onPress={onImportFromGoogleMaps}
        accessibilityRole='button'
        accessibilityLabel='Import a route from a Google Maps link'
      >
        <Ionicons name='link' size={16} color={colors.primary} />
      </Pressable>

      {hasActiveRoad ? (
        <>
          <Pressable
            style={styles.iconChip}
            onPress={onEditDetails}
            accessibilityRole='button'
            accessibilityLabel='Edit route name and description'
          >
            <Ionicons name='create-outline' size={16} color={colors.primary} />
          </Pressable>

          <Pressable
            style={styles.iconChip}
            onPress={onDeleteRoad}
            accessibilityRole='button'
            accessibilityLabel='Delete this route'
          >
            <Ionicons name='trash-outline' size={16} color={colors.danger} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    toolbar: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    roadChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: '65%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    roadChipText: {
      ...typography.label,
      color: colors.text,
      flexShrink: 1,
    },
    iconChip: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
  });

export default memo(MapToolbar);
