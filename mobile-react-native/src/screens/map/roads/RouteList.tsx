import React, { useCallback } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import RouteCard from 'screens/map/roads/RouteCard';
import ScreenState from 'components/ScreenState';
import useRefreshControlColors from 'components/useRefreshControlColors';
import { spacing, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { WaypointWithAddressAndId } from 'types/map-screen-type';
import { RoutesListProps } from 'types/screens/mapScreenType';

const RoutesList = ({
  data,
  isRefreshing,
  onRefresh,
  onToggleFavorite,
  onDelete,
  onEdit,
  onView,
  onTogglePublic,
  onShare,
  sharingRoadId,
}: RoutesListProps) => {
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<WaypointWithAddressAndId>) => (
      <RouteCard
        item={item}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDelete}
        onEdit={onEdit}
        onView={onView}
        onTogglePublic={onTogglePublic}
        onShare={onShare}
        isSharing={sharingRoadId === item.id}
      />
    ),
    [
      onDelete,
      onEdit,
      onShare,
      onToggleFavorite,
      onTogglePublic,
      onView,
      sharingRoadId,
    ],
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
            {...refreshColors}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    emptyContent: {
      flexGrow: 1,
    },
  });

export default RoutesList;
