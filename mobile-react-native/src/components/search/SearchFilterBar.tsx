import { memo, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  routeLengthFilters,
  routeSearchOrders,
} from 'constants/routeSearch';
import {
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { RouteSearchOrder } from 'types/store/services/searchService-type';

const Chip = memo(
  ({
    label,
    icon,
    isSelected,
    onPress,
  }: {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.chip,
          isSelected && styles.chipSelected,
          pressed && !isSelected && styles.chipPressed,
        ]}
        onPress={onPress}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
        accessibilityRole='button'
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={label}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={13}
            color={isSelected ? colors.textInverse : colors.textMuted}
          />
        ) : null}
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {label}
        </Text>
      </Pressable>
    );
  },
);

Chip.displayName = 'SearchFilterChip';

const OrderChip = memo(
  ({
    option,
    isSelected,
    onSelect,
  }: {
    option: (typeof routeSearchOrders)[number];
    isSelected: boolean;
    onSelect: (order: RouteSearchOrder) => void;
  }) => {
    const handlePress = useCallback(
      () => onSelect(option.key),
      [onSelect, option.key],
    );

    return (
      <Chip
        label={option.label}
        icon={option.icon}
        isSelected={isSelected}
        onPress={handlePress}
      />
    );
  },
);

OrderChip.displayName = 'SearchOrderChip';

const LengthChip = memo(
  ({
    option,
    isSelected,
    onSelect,
  }: {
    option: (typeof routeLengthFilters)[number];
    isSelected: boolean;
    onSelect: (key: string) => void;
  }) => {
    const handlePress = useCallback(
      () => onSelect(option.key),
      [onSelect, option.key],
    );

    return (
      <Chip
        label={option.label}
        isSelected={isSelected}
        onPress={handlePress}
      />
    );
  },
);

LengthChip.displayName = 'SearchLengthChip';

interface Props {
  order: RouteSearchOrder;
  onOrderChange: (order: RouteSearchOrder) => void;
  length: string;
  onLengthChange: (key: string) => void;
}

/**
 * Order on one line, filters on the next, directly under the search field —
 * both are about the list below them, so they sit between the two.
 */
const SearchFilterBar = ({
  order,
  onOrderChange,
  length,
  onLengthChange,
}: Props) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.line}>
        <Text style={styles.lineLabel}>Order</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps='handled'
        >
          {routeSearchOrders.map((option) => (
            <OrderChip
              key={option.key}
              option={option}
              isSelected={order === option.key}
              onSelect={onOrderChange}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.line}>
        <Text style={styles.lineLabel}>Filter</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps='handled'
        >
          {routeLengthFilters.map((option) => (
            <LengthChip
              key={option.key}
              option={option}
              isSelected={length === option.key}
              onSelect={onLengthChange}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { gap: spacing.xs },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingLeft: spacing.lg,
    },
    lineLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSubtle,
      width: 38,
    },
    chipRow: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipPressed: { backgroundColor: colors.surfaceAlt },
    chipText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
    chipTextSelected: { color: colors.textInverse },
  });

export default memo(SearchFilterBar);
