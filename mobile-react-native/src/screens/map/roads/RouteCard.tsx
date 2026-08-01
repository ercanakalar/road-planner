import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadows, spacing, typography } from 'theme';
import { WaypointWithAddressAndId } from 'types/map-screen-type';

type Props = {
  item: WaypointWithAddressAndId;
  onToggleFavorite: (item: WaypointWithAddressAndId) => void;
  onDelete: (item: WaypointWithAddressAndId) => void;
  onView: (roadId: string) => void;
};

const RouteCard = ({ item, onToggleFavorite, onDelete, onView }: Props) => {
  const handleView = useCallback(() => onView(item.id), [item.id, onView]);

  const handleToggleFavorite = useCallback(
    () => onToggleFavorite(item),
    [item, onToggleFavorite],
  );

  const handleDelete = useCallback(() => onDelete(item), [item, onDelete]);

  const stopCount = item.wayPoints?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handleView}
      accessibilityRole='button'
      accessibilityLabel={`Open route ${item.title}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Pressable
          onPress={handleToggleFavorite}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole='button'
          accessibilityLabel={
            item.isFavorite ? 'Remove from favourites' : 'Add to favourites'
          }
        >
          <Ionicons
            name={item.isFavorite ? 'star' : 'star-outline'}
            size={22}
            color={item.isFavorite ? colors.warning : colors.textSubtle}
          />
        </Pressable>
      </View>

      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.metaPill}>
          <Ionicons name='location-outline' size={13} color={colors.primary} />
          <Text style={styles.metaText}>
            {stopCount} stop{stopCount === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.footerActions}>
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole='button'
            accessibilityLabel={`Delete route ${item.title}`}
          >
            <Ionicons
              name='trash-outline'
              size={18}
              color={colors.textSubtle}
            />
          </Pressable>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={colors.textSubtle}
          />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  metaText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
});


export default memo(RouteCard);
