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
  top: number;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** A centred, transient note over the map — "saving", "stored locally". */
const MapStatusPill = ({ top, label, icon }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.pill, { top }]}>
      {icon ? <Ionicons name={icon} size={13} color={colors.warning} /> : null}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pill: {
      position: 'absolute',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    pillText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
  });

export default memo(MapStatusPill);
