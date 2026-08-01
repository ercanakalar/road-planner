import React, { memo, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';

import WaypointOptions from 'screens/map/roads/WaypointOptions';
import { colors, radius, shadows, spacing, typography } from 'theme';
import { WaypointWithAddress } from 'types/map-screen-type';
import { WaypointOption } from 'types/transport-type';

type WaypointCardProps = {
  item: WaypointWithAddress;
  isActive: boolean;
  isSelected: boolean;
  selectionIndex: number;
  showFavoriteAction?: boolean;
  drag: () => void;
  onToggleSelection: (id: string) => void;
  onOptionSelect: (option: WaypointOption, item: WaypointWithAddress) => void;
};

const WaypointCard = ({
  item,
  isActive,
  isSelected,
  selectionIndex,
  showFavoriteAction = true,
  drag,
  onToggleSelection,
  onOptionSelect,
}: WaypointCardProps) => {
  const handlePress = useCallback(
    () => onToggleSelection(item.id),
    [item.id, onToggleSelection],
  );

  const handleOptionSelect = useCallback(
    (option: WaypointOption) => onOptionSelect(option, item),
    [item, onOptionSelect],
  );

  const locality = [item.address?.district, item.address?.province]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onLongPress={drag}
      delayLongPress={180}
      disabled={isActive}
      style={[
        styles.card,
        isActive && styles.cardActive,
        isSelected && styles.cardSelected,
      ]}
      onPress={handlePress}
      accessibilityRole='button'
      accessibilityState={{ selected: isSelected }}
      accessibilityHint='Tap to compare, long press to reorder'
    >
      <View style={styles.row}>
        <View style={[styles.badge, isSelected && styles.badgeSelected]}>
          <Text style={styles.badgeText}>
            {isSelected && selectionIndex >= 0
              ? ['A', 'B'][selectionIndex]
              : item.order}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {item.address?.address ?? 'Unnamed stop'}
          </Text>
          {locality ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {locality}
            </Text>
          ) : (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        <WaypointOptions
          item={item}
          showFavoriteAction={showFavoriteAction}
          onOptionSelect={handleOptionSelect}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
    ...shadows.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: { flex: 1 },
  title: {
    ...typography.body,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badge: {
    width: 28,
    height: 28,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSelected: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
});

export default memo(WaypointCard);
