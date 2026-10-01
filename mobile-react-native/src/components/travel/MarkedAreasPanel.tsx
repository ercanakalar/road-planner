import { memo, useCallback, useMemo } from 'react';
import {
  Pressable,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import useAreaSummary from 'hooks/travel/useAreaSummary';
import { AREA_KIND_ICON, AREA_KIND_LABEL, cityColor } from 'constants/travelMap';
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
import { CityGroup, groupByCity } from 'utils/travelCities';
import { withAlpha } from 'utils/color';

const LIST_MAX_HEIGHT = 280;

const SWATCH_SIZE = 30;

interface Section {
  key: string;
  title: string;
  colorSlot: number | null;
  city: CityGroup | null;
  data: MarkedArea[];
}

interface Props {
  areas: MarkedArea[];
  isExpanded: boolean;
  onToggle: () => void;
  onFocus: (area: MarkedArea) => void;
  onFocusCity: (city: CityGroup) => void;
  onRemove: (placeId: string) => void;
  onClear: () => void;
}

const MarkedAreaRow = memo(
  ({
    area,
    colorSlot,
    onFocus,
    onRemove,
  }: {
    area: MarkedArea;
    colorSlot: number | null;
    onFocus: (area: MarkedArea) => void;
    onRemove: (placeId: string) => void;
  }) => {
    const { colors, scheme } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useTranslation();

    const tint = cityColor(colors, scheme, colorSlot);

    return (
      <Pressable
        onPress={() => onFocus(area)}
        accessibilityRole='button'
        accessibilityLabel={t('travelMap.showOnMap', { name: area.name })}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Ionicons name='close' size={18} color={colors.textSubtle} />
        </Pressable>
      </Pressable>
    );
  },
);

MarkedAreaRow.displayName = 'MarkedAreaRow';

const SectionHeader = memo(
  ({
    section,
    onFocusCity,
  }: {
    section: Section;
    onFocusCity: (city: CityGroup) => void;
  }) => {
    const { colors, scheme } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useTranslation();

    const places = t('travelMap.places', { count: section.data.length });
    const { city } = section;

    return (
      <Pressable
        onPress={city ? () => onFocusCity(city) : undefined}
        disabled={!city}
        accessibilityRole={city ? 'button' : 'header'}
        accessibilityLabel={
          city
            ? t('travelMap.showCity', { name: section.title, places })
            : `${section.title}, ${places}`
        }
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.sectionDot,
            { backgroundColor: cityColor(colors, scheme, section.colorSlot) },
          ]}
        />
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {section.title}
        </Text>
        <Text style={styles.sectionCount}>{places}</Text>
      </Pressable>
    );
  },
);

SectionHeader.displayName = 'SectionHeader';

const MarkedAreasPanel = ({
  areas,
  isExpanded,
  onToggle,
  onFocus,
  onFocusCity,
  onRemove,
  onClear,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const summary = useAreaSummary(areas);

  const sections = useMemo<Section[]>(() => {
    const { cities, elsewhere } = groupByCity(areas);

    return [
      ...cities.map((city) => ({
        key: city.key,
        title: city.name,
        colorSlot: city.colorSlot,
        city,
        data: city.areas,
      })),
      ...(elsewhere.length
        ? [
            {
              key: 'outside-cities',
              title: t('travelMap.outsideCities'),
              colorSlot: null,
              city: null,
              data: elsewhere,
            },
          ]
        : []),
    ];
  }, [areas, t]);

  const renderItem = useCallback(
    ({ item, section }: SectionListRenderItemInfo<MarkedArea, Section>) => (
      <MarkedAreaRow
        area={item}
        colorSlot={section.colorSlot}
        onFocus={onFocus}
        onRemove={onRemove}
      />
    ),
    [onFocus, onRemove],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<MarkedArea, Section> }) => (
      <SectionHeader section={section} onFocusCity={onFocusCity} />
    ),
    [onFocusCity],
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
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
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
          <SectionList
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            style={styles.list}
            keyboardShouldPersistTaps='handled'
            ItemSeparatorComponent={Separator}
          />

          <Pressable
            onPress={onClear}
            accessibilityRole='button'
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
      backgroundColor: colors.surface,
    },
    sectionDot: {
      width: 10,
      height: 10,
      borderRadius: radius.pill,
    },
    sectionTitle: {
      ...typography.label,
      flex: 1,
      color: colors.text,
    },
    sectionCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    pressed: { opacity: 0.7 },
    swatch: {
      width: SWATCH_SIZE,
      height: SWATCH_SIZE,
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
      marginLeft: spacing.lg + SWATCH_SIZE + spacing.md,
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
