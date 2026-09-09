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

const RoutesScreen = ({ navigation }: MapScreenProps) => {
  const styles = useThemedStyles(createStyles);

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
          title='Sign in to see your routes'
          message='Your saved routes live with your account. The Map tab works without one.'
        />
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.container}>
        <ScreenHeader
          title='My Routes'
          subtitle={
            routes.length === 0
              ? 'Nothing saved yet'
              : `${routes.length} route${routes.length === 1 ? '' : 's'} · ${stopCount} stop${
                  stopCount === 1 ? '' : 's'
                }`
          }
        />

        {isLoading ? (
          <ScreenState variant='loading' title='Loading your routes…' />
        ) : isError ? (
          <ScreenState
            variant='error'
            title='Could not load routes'
            message='Check your connection and try again.'
            actionLabel='Retry'
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
        heading='Edit route'
        initialTitle={editing?.title}
        initialDescription={editing?.description}
        titleLabel='Route name'
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
