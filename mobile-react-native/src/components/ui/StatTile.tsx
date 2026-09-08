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

/** One figure in a row of counts — routes, stops, favourites. */
const StatTile = ({ icon, value, label }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.sm,
    },
    statValue: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 25,
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
