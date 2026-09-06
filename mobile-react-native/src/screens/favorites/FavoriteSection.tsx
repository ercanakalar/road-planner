import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { FavoriteSectionHeaderProps } from 'types/screens/mapScreenType';

export const FavoriteSection = memo(
  ({ section, isExpanded, onToggle }: FavoriteSectionHeaderProps) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const handleToggle = useCallback(
      () => onToggle(section.key),
      [onToggle, section.key],
    );

    return (
      <Pressable
        style={({ pressed }) => [
          styles.header,
          // Collapsed, the header is the whole card and rounds on all corners.
          !isExpanded && styles.headerCollapsed,
          pressed && styles.headerPressed,
        ]}
        onPress={handleToggle}
        accessibilityRole='button'
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${section.title}, ${section.count} items`}
      >
        <View style={styles.titleContainer}>
          <MaterialIcons name={section.icon} size={20} color={colors.primary} />
          <Text style={styles.title}>{section.title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{section.count}</Text>
          </View>
        </View>

        <MaterialIcons
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={22}
          color={colors.textSubtle}
        />
      </Pressable>
    );
  },
);

FavoriteSection.displayName = 'FavoriteSection';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderTopLeftRadius: radius.md,
      borderTopRightRadius: radius.md,
    },
    headerCollapsed: {
      borderBottomLeftRadius: radius.md,
      borderBottomRightRadius: radius.md,
      marginBottom: spacing.md,
    },
    headerPressed: {
      backgroundColor: colors.border,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    title: {
      ...typography.overline,
      color: colors.textMuted,
      flex: 1,
    },
    badge: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: 1,
      borderRadius: radius.pill,
      minWidth: 22,
      alignItems: 'center',
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.primary,
    },
  });

export default FavoriteSection;
