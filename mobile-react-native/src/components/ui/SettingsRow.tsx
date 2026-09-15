import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** One line under the label, for a destination whose name is not enough. */
  description?: string;
  /** 'danger' for a row that undoes something, such as signing out. */
  tone?: 'default' | 'danger';
  /**
   * Whether to rule off from the row above. False on the first row of a group,
   * where a line would sit directly under the card's own edge.
   */
  divided?: boolean;
  /** How much is waiting behind this row. Hidden at zero. */
  badge?: number;
  onPress: () => void;
}

/** One tappable line in a grouped list of destinations. */
const SettingsRow = ({
  icon,
  label,
  description,
  tone = 'default',
  divided = true,
  badge = 0,
  onPress,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const isDanger = tone === 'danger';
  const accent = isDanger ? colors.danger : colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        divided && styles.divided,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      accessibilityRole='button'
    >
      <View style={[styles.glyph, isDanger && styles.glyphDanger]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.rowText, isDanger && styles.rowTextDanger]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>

      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}

      <Ionicons name='chevron-forward' size={18} color={colors.textSubtle} />
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
    },
    divided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    // A tinted disc rather than a bare glyph: at a glance it is what separates
    // one row from the next down a list of otherwise identical lines.
    glyph: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    glyphDanger: { backgroundColor: colors.dangerSoft },
    body: { flex: 1, gap: spacing.xxs },
    rowText: {
      ...typography.body,
      color: colors.text,
    },
    rowTextDanger: { color: colors.danger },
    description: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
    badge: {
      minWidth: 22,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textInverse,
    },
  });

export default memo(SettingsRow);
