import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from 'theme';
import { FavoriteSectionHeaderProps } from 'types/screens/mapScreenType';


export const FavoriteSection = memo(
  ({ section, isExpanded, onToggle }: FavoriteSectionHeaderProps) => {
    const handleToggle = useCallback(
      () => onToggle(section.key),
      [onToggle, section.key],
    );

    return (
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
        onPress={handleToggle}
        accessibilityRole='button'
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${section.title}, ${section.data.length} items`}
      >
        <View style={styles.titleContainer}>
          <MaterialIcons name={section.icon} size={20} color={colors.primary} />
          <Text style={styles.title}>{section.title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{section.data.length}</Text>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  headerPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  title: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
  },
});

export default FavoriteSection;
