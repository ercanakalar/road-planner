import { useCallback, useMemo, useState } from 'react';

import useConfirm from 'hooks/feedback/useConfirm';
import { useOpenRoadInGoogleMaps } from 'hooks/routes/useOpenInGoogleMaps';
import useShareRoad from 'hooks/routes/useShareRoad';
import { showNotification } from 'services/notificationService';
import { updateRoadDetails } from 'store/actions/roadActions';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import {
  useDeleteRoadByIdMutation,
  useGetOwnRoadsQuery,
} from 'store/services/roadService';
import type { DetailsDraft } from 'types/components/editDetailsModal';
import { MapScreenProps, OwnRoadSummary } from 'types/map-screen-type';

const EMPTY_ROADS: OwnRoadSummary[] = [];

/**
 * The saved-routes list and everything you can do to a row of it: rename,
 * publish, share, hand over to Google Maps, delete.
 */
export function useRoutesScreen(navigation: MapScreenProps['navigation']) {
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
    () => roads.reduce((total, road) => total + (road.stopCount ?? 0), 0),
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

  return {
    isLoggedIn,
    roads,
    stopCount,
    isLoading,
    isFetching,
    isError,
    editing,
    isSaving,
    sharingRoadId,
    openingRoadId,
    shareRoad,
    handleRefresh,
    handleView,
    handleEdit,
    closeEditor,
    handleSaveDetails,
    handleDeleteRoad,
    handleTogglePublic,
    handleToggleFavorite,
    handleOpenInGoogleMaps,
  };
}

export default useRoutesScreen;
