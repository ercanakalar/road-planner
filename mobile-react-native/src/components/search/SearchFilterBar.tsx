import { memo, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { routeLengthFilters, routeSearchOrders } from 'constants/routeSearch';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RouteSearchOrder } from 'types/store/services/searchService-type';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();

    const handlePress = useCallback(
      () => onSelect(option.key),
      [onSelect, option.key],
    );

    return (
      <Chip
        label={t(option.label)}
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
    const { t } = useTranslation();

    const handlePress = useCallback(
      () => onSelect(option.key),
      [onSelect, option.key],
    );

    return (
      <Chip label={t(option.label)} isSelected={isSelected} onPress={handlePress} />
    );
  },
);

LengthChip.displayName = 'SearchLengthChip';

/**
 * The person the list is narrowed to, with the way out of it.
 *
 * It sits with the filters rather than in the header because that is what it
 * is — picking somebody in the People tab is a filter on the same list, not a
 * different screen.
 */
const AuthorChip = memo(
  ({ name, onClear }: { name: string; onClear: () => void }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.chip,
          styles.authorChip,
          pressed && styles.chipPressed,
        ]}
        onPress={onClear}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
        accessibilityRole='button'
        accessibilityLabel={`Stop showing only routes by ${name}`}
      >
        <Ionicons name='person' size={12} color={colors.primary} />
        <Text style={[styles.chipText, styles.authorChipText]} numberOfLines={1}>
          {name}
        </Text>
        <Ionicons name='close' size={14} color={colors.primary} />
      </Pressable>
    );
  },
);

AuthorChip.displayName = 'SearchAuthorChip';

interface Props {
  order: RouteSearchOrder;
  onOrderChange: (order: RouteSearchOrder) => void;
  length: string;
  onLengthChange: (key: string) => void;
  /** Set while the list is narrowed to one person. */
  authorName?: string | null;
  onClearAuthor?: () => void;
  /** How many matched in total — "312 routes" — not how many are on screen. */
  summary?: string | null;
  /** True while that number belongs to the previous question. */
  isSummaryStale?: boolean;
}

/**
 * Order on one line, filters on the next, directly under the search field —
 * both are about the list below them, so they sit between the two. The count
 * closes the pair off: it is the answer to what the two lines above just asked.
 */
const SearchFilterBar = ({
  order,
  onOrderChange,
  length,
  onLengthChange,
  authorName,
  onClearAuthor,
  summary,
  isSummaryStale,
}: Props) => {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const hasAuthor = !!authorName && !!onClearAuthor;

  return (
    <View style={styles.container}>
      <View style={styles.line}>
        <Text style={styles.lineLabel}>{t('actions.order')}</Text>
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
        <Text style={styles.lineLabel}>{t('actions.filter')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps='handled'
        >
          {hasAuthor ? (
            <AuthorChip name={authorName} onClear={onClearAuthor} />
          ) : null}

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

      {summary ? (
        <View style={styles.summaryLine}>
          <Text
            style={[styles.summary, isSummaryStale && styles.summaryStale]}
            accessibilityLiveRegion='polite'
          >
            {summary}
          </Text>
        </View>
      ) : null}
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
    authorChip: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
      maxWidth: 190,
    },
    authorChipText: { color: colors.primary, flexShrink: 1 },
    summaryLine: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxs,
    },
    summary: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSubtle,
    },
    // Dimmed rather than blanked: a count that disappears on every keystroke
    // moves the list under the reader's thumb.
    summaryStale: { opacity: 0.45 },
  });

export default memo(SearchFilterBar);
