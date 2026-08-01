import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';

import ScreenState from 'components/ScreenState';
import { FavoriteSection } from './FavoriteSection';
import { FavoriteItem } from './FavoriteItem';

import {
  useGetFavoritesQuery,
  useToggleFavoriteRoadMutation,
  useToggleFavoriteWaypointMutation,
} from 'store/services/favoriteService';
import { showNotification } from 'services/notificationService';

import { colors, spacing } from 'theme';
import {
  FavoriteEntry,
  FavoriteSectionKey,
} from 'types/store/services/favoriteService-type';
import {
  FavoriteSectionDescriptor,
  MaterialIconName,
} from 'types/screens/mapScreenType';
import { RootStackParamList } from 'types/screens/screens';

const SECTIONS: {
  key: FavoriteSectionKey;
  title: string;
  icon: MaterialIconName;
}[] = [
  { key: 'ownRoads', title: 'My routes', icon: 'directions-car' },
  { key: 'ownWaypoints', title: 'My places', icon: 'location-on' },
  { key: 'othersRoads', title: "Others' routes", icon: 'public' },
  { key: 'othersWaypoints', title: "Others' places", icon: 'place' },
];

const Favorite = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [expanded, setExpanded] = useState<FavoriteSectionKey | null>(
    'ownRoads',
  );

  const {
    data: favorites,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetFavoritesQuery();

  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();
  const [toggleFavoriteWaypoint] = useToggleFavoriteWaypointMutation();

  const toggleSection = useCallback((key: FavoriteSectionKey) => {
    setExpanded((previous) => (previous === key ? null : key));
  }, []);

  const handleRemove = useCallback(
    async (item: FavoriteEntry) => {
      try {
        if (item.kind === 'road') {
          await toggleFavoriteRoad({ roadId: item.targetId }).unwrap();
        } else {
          await toggleFavoriteWaypoint({
            waypointId: item.targetId,
          }).unwrap();
        }
      } catch {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Could not remove that favourite.',
        });
      }
    },
    [toggleFavoriteRoad, toggleFavoriteWaypoint],
  );

  const handleItemPress = useCallback(
    (item: FavoriteEntry) => {
      if (item.kind === 'road') {
        navigation.navigate('ShowRouteByIdScreen', { roadId: item.targetId });
      } else {
        navigation.navigate('ShowWaypointById', { waypointId: item.targetId });
      }
    },
    [navigation],
  );

  /*
   * Collapsed sections carry an empty `data` array, which is how a SectionList
   * expresses an accordion — the header stays mounted, the rows unmount.
   */
  const sections = useMemo<FavoriteSectionDescriptor[]>(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        data: expanded === section.key ? favorites?.[section.key] ?? [] : [],
      })),
    [expanded, favorites],
  );

  const totalCount = useMemo(
    () =>
      SECTIONS.reduce(
        (total, section) => total + (favorites?.[section.key].length ?? 0),
        0,
      ),
    [favorites],
  );

  const renderSectionHeader = useCallback(
    ({
      section,
    }: {
      section: SectionListData<FavoriteEntry, FavoriteSectionDescriptor>;
    }) => (
      <FavoriteSection
        section={{ ...section, data: favorites?.[section.key] ?? [] }}
        isExpanded={expanded === section.key}
        onToggle={toggleSection}
      />
    ),
    [expanded, favorites, toggleSection],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<FavoriteEntry>) => (
      <FavoriteItem
        item={item}
        onPress={handleItemPress}
        onRemove={handleRemove}
      />
    ),
    [handleItemPress, handleRemove],
  );

  const keyExtractor = useCallback(
    (item: FavoriteEntry) => item.favoriteId,
    [],
  );

  if (isLoading) {
    return <ScreenState variant='loading' title='Loading favourites…' />;
  }

  if (isError && !favorites) {
    return (
      <ScreenState
        variant='error'
        title='Could not load favourites'
        message='Check your connection and try again.'
        actionLabel='Retry'
        onAction={refetch}
      />
    );
  }

  if (totalCount === 0) {
    return (
      <ScreenState
        variant='empty'
        icon='star-outline'
        title='Nothing saved yet'
        message='Star a route or a stop and it will show up here.'
      />
    );
  }

  return (
    <View style={styles.container}>
      <SectionList<FavoriteEntry, FavoriteSectionDescriptor>
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        SectionSeparatorComponent={SectionSpacer}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </View>
  );
};

const SectionSpacer = () => <View style={styles.sectionSpacer} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionSpacer: {
    height: spacing.sm,
  },
});

export default Favorite;
