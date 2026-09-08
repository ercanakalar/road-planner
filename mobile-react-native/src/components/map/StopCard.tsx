import { memo, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';

import StopOptions from 'components/map/StopOptions';
import StopShapeRow from 'components/map/StopShapeRow';
import { radius, shadows, spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { StopWithAddress } from 'types/map-screen-type';
import { StopOption } from 'types/transport-type';
import { addressLocality, addressName } from 'utils/address';

type StopCardProps = {
  item: StopWithAddress;
  isActive: boolean;
  isSelected: boolean;
  selectionIndex: number;
  showFavoriteAction?: boolean;
  drag: () => void;
  onToggleSelection: (id: string) => void;
  onOptionSelect: (option: StopOption, item: StopWithAddress) => void;
};

const StopCard = ({
  item,
  isActive,
  isSelected,
  selectionIndex,
  showFavoriteAction = true,
  drag,
  onToggleSelection,
  onOptionSelect,
}: StopCardProps) => {
  const styles = useThemedStyles(createStyles);

  const handlePress = useCallback(
    () => onToggleSelection(item.id),
    [item.id, onToggleSelection],
  );

  const handleOptionSelect = useCallback(
    (option: StopOption) => onOptionSelect(option, item),
    [item, onOptionSelect],
  );

  const locality = addressLocality(item.address);

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
            {addressName(item.address) || 'Unnamed stop'}
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

          <StopShapeRow shape={item} />
        </View>

        <StopOptions
          item={item}
          showFavoriteAction={showFavoriteAction}
          onOptionSelect={handleOptionSelect}
        />
      </View>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
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
      // Same colour the map gives the A and B pins, so the two views name the
      // pair the same way.
      backgroundColor: colors.selection,
    },
    badgeText: {
      ...typography.caption,
      color: colors.textInverse,
      fontWeight: '700',
    },
  });

export default memo(StopCard);
