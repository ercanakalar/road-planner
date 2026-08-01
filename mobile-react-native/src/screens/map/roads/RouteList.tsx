import React, { useCallback } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import RouteCard from 'screens/map/roads/RouteCard';
import ScreenState from 'components/ScreenState';
import { colors, spacing } from 'theme';
import { WaypointWithAddressAndId } from 'types/map-screen-type';
import { RoutesListProps } from 'types/screens/mapScreenType';

const RoutesList = ({
  data,
  isRefreshing,
  onRefresh,
  onToggleFavorite,
  onDelete,
  onView,
}: RoutesListProps) => {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<WaypointWithAddressAndId>) => (
      <RouteCard
        item={item}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDelete}
        onView={onView}
      />
    ),
    [onDelete, onToggleFavorite, onView],
  );

  const keyExtractor = useCallback(
    (item: WaypointWithAddressAndId) => item.id,
    [],
  );

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={
        data.length === 0 ? styles.emptyContent : styles.listContent
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListEmptyComponent={
        <ScreenState
          variant='empty'
          title='No routes yet'
          message='Create a route to start planning stops and comparing travel times.'
        />
      }
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
});

export default RoutesList;
