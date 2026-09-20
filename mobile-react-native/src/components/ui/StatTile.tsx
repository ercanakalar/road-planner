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
