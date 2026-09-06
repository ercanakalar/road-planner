import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import Container from 'components/ui/Container';
import ScreenHeader from 'components/ui/ScreenHeader';
import ScreenState from 'components/ui/ScreenState';
import EditDetailsModal, { DetailsDraft } from 'components/road/EditDetailsModal';
import { useConfirm } from 'components/feedback/ConfirmProvider';
import RoutesList from './RouteList';

import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  useDeleteRoadByIdMutation,
  useGetOwnRoadsQuery,
} from 'store/services/roadService';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import { updateRoadDetails } from 'store/actions/roadActions';
import { showNotification } from 'services/notificationService';
import useShareRoad from 'hooks/useShareRoad';
import { useOpenRoadInGoogleMaps } from 'hooks/useOpenInGoogleMaps';

import { spacing, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { MapScreenProps, OwnRoadSummary } from 'types/map-screen-type';

const EMPTY_ROADS: OwnRoadSummary[] = [];

const RoutesScreen = ({ navigation }: MapScreenProps) => {
  const styles = useThemedStyles(createStyles);

  const dispatch = useAppDispatch();
  const confirm = useConfirm();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const { shareRoad, sharingRoadId } = useShareRoad();
  const { openRoadInGoogleMaps, openingRoadId } = useOpenRoadInGoogleMaps();
  const [editing, setEditing] = useState<OwnRoadSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: roads = EMPTY_ROADS,
    refetch,
    isFetching,
    isLoading,
    isError,
  } = useGetOwnRoadsQuery(undefined, { skip: !isLoggedIn });

  const [deleteRoadById] = useDeleteRoadByIdMutation();
  const [toggleFavoriteRoad] = useToggleFavoriteRoadMutation();

  const stopCount = useMemo(
    () =>
      roads.reduce((total, road) => total + (road.stopCount ?? 0), 0),
    [roads],
  );

  const handleDeleteRoad = useCallback(
    async (road: OwnRoadSummary) => {
      const confirmed = await confirm({
        title: 'Remove route',
        message: `“${road.title}” leaves your list and stops being shared. Anyone who saved it keeps their copy.`,
        confirmLabel: 'Remove',
        icon: 'trash-outline',
        tone: 'danger',
      });
      if (confirmed) deleteRoadById({ roadId: road.id });
    },
    [confirm, deleteRoadById],
  );

  const handleTogglePublic = useCallback(
    async (road: OwnRoadSummary) => {
      const next = !road.isPublic;

      if (next) {
        const confirmed = await confirm({
          title: 'Share this route',
          message: `“${road.title}” and its stops become visible to everyone, next to your name. You can stop sharing at any time.`,
          confirmLabel: 'Share',
          icon: 'globe-outline',
        });
        if (!confirmed) return;
      }

      await dispatch(
        updateRoadDetails({
          roadId: road.id,
          title: road.title,
          description: road.description,
          isPublic: next,
        }),
      );
    },
    [confirm, dispatch],
  );

  const handleToggleFavorite = useCallback(
    (road: OwnRoadSummary) => {
      toggleFavoriteRoad({ roadId: road.id });
    },
    [toggleFavoriteRoad],
  );

  const handleRefresh = useCallback(() => {
    if (isLoggedIn) refetch();
  }, [isLoggedIn, refetch]);

  const handleView = useCallback(
    (roadId: string) => navigation.navigate('ShowRouteByIdScreen', { roadId }),
    [navigation],
  );

  const handleEdit = useCallback(
    (road: OwnRoadSummary) => setEditing(road),
    [],
  );

  const handleOpenInGoogleMaps = useCallback(
    (road: OwnRoadSummary) => {
      openRoadInGoogleMaps(road.id);
    },
    [openRoadInGoogleMaps],
  );

  const closeEditor = useCallback(() => setEditing(null), []);

  const handleSaveDetails = useCallback(
    async ({ title, description, isPublic }: DetailsDraft) => {
      if (!editing) return;
      setIsSaving(true);

      try {
        await dispatch(
          updateRoadDetails({
            roadId: editing.id,
            title,
            description,
            isPublic,
          }),
        );
        setEditing(null);
      } catch {
        showNotification({
          type: 'error',
          header: 'Could not save',
          message: 'Your changes were not applied. Please try again.',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [dispatch, editing],
  );

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
            roads.length === 0
              ? 'Nothing saved yet'
              : `${roads.length} road${roads.length === 1 ? '' : 's'} · ${stopCount} stop${
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
            data={roads}
            isRefreshing={isFetching}
            onRefresh={handleRefresh}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteRoad}
            onEdit={handleEdit}
            onView={handleView}
            onTogglePublic={handleTogglePublic}
            onShare={shareRoad}
            onOpenInGoogleMaps={handleOpenInGoogleMaps}
            sharingRoadId={sharingRoadId}
            openingInMapsRoadId={openingRoadId}
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
