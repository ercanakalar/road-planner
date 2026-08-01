import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from 'theme';
import { FavoriteItemProps } from 'types/screens/mapScreenType';

export const FavoriteItem = memo(
  ({ item, onPress, onRemove }: FavoriteItemProps) => {
    const handlePress = useCallback(() => onPress(item), [item, onPress]);

    const handleRemove = useCallback(() => {
      Alert.alert(
        'Remove favourite',
        `Remove “${item.title}” from your favourites?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemove(item),
          },
        ],
      );
    }, [item, onRemove]);

    const isRoad = item.kind === 'road';

    return (
      <Pressable
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
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
        </View>

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

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
