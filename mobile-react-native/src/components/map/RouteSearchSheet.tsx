import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  placeCategories,
  routeSearchSorts,
  searchRadiusOptions,
} from 'constants/placeCategories';
import { RoutePlace, RouteSearchSort } from 'services/mapsService';
import { RouteSearchState } from 'hooks/useRouteSearch';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  useThemedTextInputProps,
} from 'theme';
import type { ThemeColors } from 'theme';
import { metersToDistance } from 'utils/secondsToHour';

interface Props {
  visible: boolean;
  search: RouteSearchState;
  onClose: () => void;
  onShowOnMap: (place: RoutePlace) => void;
  onAddStop: (place: RoutePlace) => void;
}

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
            size={14}
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

Chip.displayName = 'RouteSearchChip';

const CategoryChip = memo(
  ({
    category,
    isSelected,
    onToggle,
  }: {
    category: (typeof placeCategories)[number];
    isSelected: boolean;
    onToggle: (key: string) => void;
  }) => {
    const handlePress = useCallback(
      () => onToggle(category.key),
      [category.key, onToggle],
    );

    return (
      <Chip
        label={category.label}
        icon={category.icon}
        isSelected={isSelected}
        onPress={handlePress}
      />
    );
  },
);

CategoryChip.displayName = 'RouteSearchCategoryChip';

const RadiusChip = memo(
  ({
    option,
    isSelected,
    onSelect,
  }: {
    option: (typeof searchRadiusOptions)[number];
    isSelected: boolean;
    onSelect: (meters: number) => void;
  }) => {
    const handlePress = useCallback(
      () => onSelect(option.meters),
      [onSelect, option.meters],
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

RadiusChip.displayName = 'RouteSearchRadiusChip';

const SortChip = memo(
  ({
    option,
    isSelected,
    onSelect,
  }: {
    option: (typeof routeSearchSorts)[number];
    isSelected: boolean;
    onSelect: (sortBy: RouteSearchSort) => void;
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

SortChip.displayName = 'RouteSearchSortChip';

const PlaceRow = memo(
  ({
    place,
    onShowOnMap,
    onAddStop,
  }: {
    place: RoutePlace;
    onShowOnMap: (place: RoutePlace) => void;
    onAddStop: (place: RoutePlace) => void;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const handleShow = useCallback(
      () => onShowOnMap(place),
      [onShowOnMap, place],
    );
    const handleAdd = useCallback(() => onAddStop(place), [onAddStop, place]);

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={handleShow}
        accessibilityRole='button'
        accessibilityLabel={`${place.name}, ${metersToDistance(
          place.distanceFromRouteMeters,
        )} off the route`}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {place.name}
          </Text>

          {place.address ? (
            <Text style={styles.rowAddress} numberOfLines={1}>
              {place.address}
            </Text>
          ) : null}

          <View style={styles.rowMeta}>
            {place.rating !== undefined ? (
              <View style={styles.rating}>
                <Ionicons name='star' size={11} color={colors.warning} />
                <Text style={styles.rowMetaText}>
                  {place.rating.toFixed(1)}
                  {place.ratingCount ? ` (${place.ratingCount})` : ''}
                </Text>
              </View>
            ) : null}

            <Text style={styles.rowMetaText}>
              {metersToDistance(place.distanceFromRouteMeters)} off route
            </Text>

            {place.openNow === false ? (
              <Text style={styles.closed}>Closed</Text>
            ) : null}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
          onPress={handleAdd}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={`Add ${place.name} to the route`}
        >
          <Ionicons name='add' size={20} color={colors.primary} />
        </Pressable>
      </Pressable>
    );
  },
);

PlaceRow.displayName = 'RouteSearchPlaceRow';

const RouteSearchSheet = ({
  visible,
  search,
  onClose,
  onShowOnMap,
  onAddStop,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inputTheme = useThemedTextInputProps();

  const {
    query,
    setQuery,
    category,
    toggleCategory,
    radiusMeters,
    setRadiusMeters,
    sortBy,
    setSortBy,
    openNow,
    toggleOpenNow,
    places,
    result,
    isSearching,
    hasSearched,
    isRoutable,
    error,
  } = search;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<RoutePlace>) => (
      <PlaceRow
        place={item}
        onShowOnMap={onShowOnMap}
        onAddStop={onAddStop}
      />
    ),
    [onAddStop, onShowOnMap],
  );

  const keyExtractor = useCallback((item: RoutePlace) => item.placeId, []);

  const hasSearch = Boolean(query.trim() || category);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={swallowPress}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>On the way</Text>
              <Text style={styles.subheading}>
                {isRoutable
                  ? `Within ${metersToDistance(radiusMeters)} of your route`
                  : 'Add a second stop to search along a route'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel='Close search'
            >
              <Ionicons name='close' size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name='search' size={18} color={colors.textMuted} />
            <TextInput
              placeholder='Anything: sushi, car wash, playground…'
              value={query}
              onChangeText={setQuery}
              style={styles.input}
              {...inputTheme}
              returnKeyType='search'
              autoCorrect={false}
              editable={isRoutable}
            />
            {isSearching ? (
              <ActivityIndicator size='small' color={colors.textMuted} />
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
            keyboardShouldPersistTaps='handled'
          >
            {placeCategories.map((option) => (
              <CategoryChip
                key={option.key}
                category={option}
                isSelected={category === option.key}
                onToggle={toggleCategory}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
            keyboardShouldPersistTaps='handled'
          >
            {searchRadiusOptions.map((option) => (
              <RadiusChip
                key={option.meters}
                option={option}
                isSelected={radiusMeters === option.meters}
                onSelect={setRadiusMeters}
              />
            ))}

            <View style={styles.chipDivider} />

            <Chip
              label='Open now'
              icon='time-outline'
              isSelected={openNow}
              onPress={toggleOpenNow}
            />
          </ScrollView>

          {places.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps='handled'
            >
              <Text style={styles.resultsCount}>
                {places.length} place{places.length === 1 ? '' : 's'}
              </Text>

              <View style={styles.chipDivider} />

              {routeSearchSorts.map((option) => (
                <SortChip
                  key={option.key}
                  option={option}
                  isSelected={sortBy === option.key}
                  onSelect={setSortBy}
                />
              ))}
            </ScrollView>
          ) : null}

          <FlatList
            data={places}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps='handled'
            ListHeaderComponent={
              result && !result.coversWholeRoute ? (
                <View style={styles.notice}>
                  <Ionicons
                    name='information-circle-outline'
                    size={14}
                    color={colors.warning}
                  />
                  <Text style={styles.noticeText}>
                    This route is long enough that only stretches of it were
                    searched. A wider radius covers more of it.
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {!isRoutable
                  ? 'A route needs two stops before there is anything to search along.'
                  : error
                    ? error
                    : !hasSearch
                      ? 'Pick a kind of place, or type what you are after.'
                      : isSearching
                        ? 'Looking along your route…'
                        : hasSearched
                          ? 'Nothing of the sort along this route. Try a wider radius.'
                          : ''}
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const swallowPress = () => {};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      height: '90%',
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: colors.surface,
      paddingTop: spacing.md,
      ...shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    headerText: { flex: 1, gap: 2 },
    heading: {
      ...typography.heading,
      color: colors.text,
    },
    subheading: {
      ...typography.caption,
      color: colors.textMuted,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.md,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 0,
    },
    chipScroll: { flexGrow: 0 },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipPressed: { backgroundColor: colors.primarySoft },
    chipText: {
      ...typography.label,
      color: colors.textMuted,
    },
    chipTextSelected: { color: colors.textInverse },
    chipDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.border,
    },
    resultsCount: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceAlt,
    },
    noticeText: {
      flex: 1,
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
    list: { flex: 1 },
    listContent: { paddingBottom: spacing.xxl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    rowText: { flex: 1, gap: 2 },
    rowTitle: {
      ...typography.body,
      color: colors.text,
    },
    rowAddress: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSubtle,
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: 2,
    },
    rating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    rowMetaText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
    closed: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.danger,
    },
    add: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    addPressed: { backgroundColor: colors.border },
    empty: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
  });

export default memo(RouteSearchSheet);
