import { memo, useCallback } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import useAreaSummary from 'hooks/travel/useAreaSummary';
import { areaColor, AREA_KIND_ICON, AREA_KIND_LABEL } from 'constants/travelMap';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { MarkedArea } from 'types/travel-map';
import { withAlpha } from 'utils/color';

/** Tall enough for four rows; past that the list scrolls under the map. */
const LIST_MAX_HEIGHT = 244;

interface Props {
  areas: MarkedArea[];
  isExpanded: boolean;
  onToggle: () => void;
  onFocus: (area: MarkedArea) => void;
  onRemove: (placeId: string) => void;
  onClear: () => void;
}

const MarkedAreaRow = memo(
  ({
    area,
    onFocus,
    onRemove,
  }: {
    area: MarkedArea;
    onFocus: (area: MarkedArea) => void;
    onRemove: (placeId: string) => void;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useTranslation();

    const tint = areaColor(colors, area.kind);

    return (
      <Pressable
        onPress={() => onFocus(area)}
        accessibilityRole='button'
        accessibilityLabel={t('travelMap.showOnMap', { name: area.name })}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={[styles.swatch, { backgroundColor: withAlpha(tint, 0.2) }]}>
          <Ionicons name={AREA_KIND_ICON[area.kind]} size={15} color={tint} />
        </View>

        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {area.name}
          </Text>
          <Text style={styles.rowAddress} numberOfLines={1}>
            {t(AREA_KIND_LABEL[area.kind])} · {area.address}
          </Text>
        </View>

        <Pressable
          onPress={() => onRemove(area.placeId)}
          hitSlop={10}
          accessibilityRole='button'
          accessibilityLabel={t('travelMap.removeFromMap', {
            name: area.name,
          })}
          style={({ pressed }) => [pressed && styles.rowPressed]}
        >
          <Ionicons name='close' size={18} color={colors.textSubtle} />
        </Pressable>
      </Pressable>
    );
  },
);

MarkedAreaRow.displayName = 'MarkedAreaRow';

/**
 * What has been coloured in so far: a count that is always on screen, and the
 * list itself when it is asked for.
 *
 * It stays collapsed by default because the map is the point — the list is for
 * finding one place again, or taking one back off.
 */
const MarkedAreasPanel = ({
  areas,
  isExpanded,
  onToggle,
  onFocus,
  onRemove,
  onClear,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const summary = useAreaSummary(areas);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MarkedArea>) => (
      <MarkedAreaRow area={item} onFocus={onFocus} onRemove={onRemove} />
    ),
    [onFocus, onRemove],
  );

  const keyExtractor = useCallback((area: MarkedArea) => area.placeId, []);

  const marked = t('travelMap.marked', { count: areas.length });

  const subtitle = areas.length
    ? summary || t('travelMap.onYourMap')
    : t('travelMap.markSomething');

  return (
    <View style={styles.panel}>
      <Pressable
        onPress={areas.length ? onToggle : undefined}
        disabled={!areas.length}
        accessibilityRole={areas.length ? 'button' : 'summary'}
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={
          areas.length
            ? t(isExpanded ? 'travelMap.hideList' : 'travelMap.showList', {
                places: t('travelMap.places', { count: areas.length }),
              })
            : undefined
        }
        style={({ pressed }) => [styles.header, pressed && styles.rowPressed]}
      >
        <View style={styles.headings}>
          <Text style={styles.title}>
            {areas.length ? marked : t('travelMap.nothingMarked')}
          </Text>
          <Text style={styles.summary} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {areas.length ? (
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={colors.textMuted}
          />
        ) : null}
      </Pressable>

      {isExpanded && areas.length ? (
        <>
          <FlatList
            data={areas}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={styles.list}
            keyboardShouldPersistTaps='handled'
            ItemSeparatorComponent={Separator}
          />

          <Pressable
            onPress={onClear}
            accessibilityRole='button'
            style={({ pressed }) => [styles.clear, pressed && styles.rowPressed]}
          >
            <Ionicons name='trash-outline' size={15} color={colors.danger} />
            <Text style={styles.clearText}>{t('travelMap.clearMap')}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
};

const Separator = () => {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.separator} />;
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    headings: { flex: 1, gap: spacing.xxs },
    title: {
      ...typography.heading,
      color: colors.text,
    },
    summary: {
      ...typography.caption,
      color: colors.textMuted,
    },
    list: {
      maxHeight: LIST_MAX_HEIGHT,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    rowPressed: { opacity: 0.7 },
    swatch: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, gap: spacing.xxs },
    rowName: {
      ...typography.label,
      color: colors.text,
    },
    rowAddress: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textMuted,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing.lg + 30 + spacing.md,
      backgroundColor: colors.border,
    },
    clear: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    clearText: {
      ...typography.label,
      color: colors.danger,
    },
  });

export default memo(MarkedAreasPanel);
