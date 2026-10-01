import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import RouteCard from './RouteCard';
import ScreenState from 'components/ui/ScreenState';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import { spacing, useTheme, useThemedStyles } from 'theme';
import { OwnRouteSummary } from 'types/map-screen-type';
import { RoutesListProps } from 'types/screens/mapScreenType';
import { useTranslation } from 'react-i18next';

const RoutesList = ({
  data,
  isRefreshing,
  isLoadingMore = false,
  onRefresh,
  onEndReached,
  onToggleFavorite,
  onDelete,
  onEdit,
  onView,
  onTogglePublic,
  onShare,
  onOpenInGoogleMaps,
  sharingRouteId,
  openingInMapsRouteId,
}: RoutesListProps) => {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const refreshColors = useRefreshControlColors();
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OwnRouteSummary>) => (
      <RouteCard
        item={item}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDelete}
        onEdit={onEdit}
        onView={onView}
        onTogglePublic={onTogglePublic}
        onShare={onShare}
        onOpenInGoogleMaps={onOpenInGoogleMaps}
        isSharing={sharingRouteId === item.id}
        isOpeningInMaps={openingInMapsRouteId === item.id}
      />
    ),
    [
      onDelete,
      onEdit,
      onOpenInGoogleMaps,
      onShare,
      onToggleFavorite,
      onTogglePublic,
      onView,
      openingInMapsRouteId,
      sharingRouteId,
    ],
  );

  const keyExtractor = useCallback(
    (item: OwnRouteSummary) => item.id,
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
          title={t('routes.emptyTitle')}
          message={t('routes.emptyMessage')}
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator
            style={styles.footer}
            color={colors.primary}
            accessibilityLabel={t('states.loadingRoutes')}
          />
        ) : null
      }
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews
    />
  );
};

const createStyles = () =>
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
    footer: {
      paddingVertical: spacing.lg,
    },
  });

export default RoutesList;
