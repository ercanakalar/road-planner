import { StyleSheet, View } from 'react-native';

import Container from 'components/ui/Container';
import ScreenHeader from 'components/ui/ScreenHeader';
import ScreenState from 'components/ui/ScreenState';
import EditDetailsModal from 'components/route/EditDetailsModal';
import useRoutesScreen from 'hooks/routes/useRoutesScreen';
import RoutesList from './RouteList';

import { spacing, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { MapScreenProps } from 'types/map-screen-type';
import { useTranslation } from 'react-i18next';

const RoutesScreen = ({ navigation }: MapScreenProps) => {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const {
    isLoggedIn,
    routes,
    stopCount,
    isLoading,
    isFetching,
    isError,
    editing,
    isSaving,
    sharingRouteId,
    openingRouteId,
    shareRoute,
    handleRefresh,
    handleView,
    handleEdit,
    closeEditor,
    handleSaveDetails,
    handleDeleteRoute,
    handleTogglePublic,
    handleToggleFavorite,
    handleOpenInGoogleMaps,
  } = useRoutesScreen(navigation);

  if (!isLoggedIn) {
    return (
      <Container>
        <ScreenState
          variant='empty'
          icon='lock-closed-outline'
          title={t('routes.signedOutTitle')}
          message={t('routes.signedOutMessage')}
        />
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.container}>
        <ScreenHeader
          title={t('routes.title')}
          subtitle={
            routes.length === 0
              ? t('routes.nothingSavedYet')
              : `${t('routes.routeCount', {
                  count: routes.length,
                })} · ${t('routes.stopCount', { count: stopCount })}`
          }
        />

        {isLoading ? (
          <ScreenState variant='loading' title={t('states.loadingRoutes')} />
        ) : isError ? (
          <ScreenState
            variant='error'
            title={t('routes.errorTitle')}
            message={t('states.checkConnection')}
            actionLabel={t('common.retry')}
            onAction={handleRefresh}
          />
        ) : (
          <RoutesList
            data={routes}
            isRefreshing={isFetching}
            onRefresh={handleRefresh}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteRoute}
            onEdit={handleEdit}
            onView={handleView}
            onTogglePublic={handleTogglePublic}
            onShare={shareRoute}
            onOpenInGoogleMaps={handleOpenInGoogleMaps}
            sharingRouteId={sharingRouteId}
            openingInMapsRouteId={openingRouteId}
          />
        )}
      </View>

      <EditDetailsModal
        visible={editing !== null}
        heading={t('routes.editRoute')}
        initialTitle={editing?.title}
        initialDescription={editing?.description}
        titleLabel={t('defaults.routeName')}
        isSaving={isSaving}
        showPublishToggle
        initialIsPublic={editing?.isPublic ?? false}
        onSave={handleSaveDetails}
        onCancel={closeEditor}
      />
    </Container>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
  });

export default RoutesScreen;
