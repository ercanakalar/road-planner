import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { FavoriteItemProps } from 'types/screens/mapScreenType';

export const FavoriteItem = memo(
  ({ item, isHighlighted, onPress, onEdit, onRemove }: FavoriteItemProps) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const handlePress = useCallback(() => onPress(item), [item, onPress]);

    const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);

    const handleRemove = useCallback(() => onRemove(item), [item, onRemove]);

    const isRoad = item.kind === 'road';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.item,
          isHighlighted && styles.itemHighlighted,
          pressed && styles.itemPressed,
        ]}
        onPress={handlePress}
        accessibilityRole='button'
        accessibilityLabel={`Open ${item.title}`}
      >
        <View style={[styles.iconContainer, !isRoad && styles.iconWaypoint]}>
          <Ionicons
            name={isRoad ? 'git-branch-outline' : 'location-outline'}
            size={18}
            color={isRoad ? colors.primary : colors.accent}
          />
        </View>

        <View style={styles.itemText}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
          {item.isWithdrawn ? (
            <View style={styles.withdrawnRow}>
              <Ionicons
                name='archive-outline'
                size={11}
                color={colors.textSubtle}
              />
              <Text style={styles.withdrawnText}>
                Removed by its owner · your copy still works
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.itemPressed,
          ]}
          onPress={handleEdit}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={`Rename ${item.title}`}
        >
          <Ionicons name='create-outline' size={18} color={colors.textSubtle} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.removePressed,
          ]}
          onPress={handleRemove}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={`Remove ${item.title} from favourites`}
        >
          <Ionicons name='close' size={18} color={colors.textSubtle} />
        </Pressable>
      </Pressable>
    );
  },
);

FavoriteItem.displayName = 'FavoriteItem';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    itemHighlighted: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
    },
    itemPressed: {
      backgroundColor: colors.surfaceAlt,
    },
    iconContainer: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWaypoint: {
      backgroundColor: colors.accentSoft,
    },
    itemText: { flex: 1 },
    itemName: {
      ...typography.body,
      color: colors.text,
    },
    withdrawnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xxs,
    },
    withdrawnText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textSubtle,
      flexShrink: 1,
    },
    itemSubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    removeButton: {
      padding: spacing.sm,
      borderRadius: radius.sm,
    },
    removePressed: {
      backgroundColor: colors.dangerSoft,
    },
  });

export default FavoriteItem;
