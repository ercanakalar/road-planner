import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}

/**
 * One figure in a row of counts — routes, stops, favourites.
 *
 * The icon sits beside the figure rather than above it: this row shares the
 * first screenful with the greeting, the search bar and the way in to the
 * travel map, and a third line here costs more than it says.
 */
const StatTile = ({ icon, value, label }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stat}>
      <View style={styles.figure}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.sm,
    },
    figure: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    statValue: {
      ...typography.title,
      fontSize: 19,
      lineHeight: 24,
      color: colors.text,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
  });

export default memo(StatTile);
