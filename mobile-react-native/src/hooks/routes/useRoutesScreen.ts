import { useCallback, useMemo, useState } from 'react';

import useConfirm from 'hooks/feedback/useConfirm';
import { useOpenRouteInGoogleMaps } from 'hooks/routes/useOpenInGoogleMaps';
import useShareRoute from 'hooks/routes/useShareRoute';
import { showNotification } from 'services/notificationService';
import { updateRouteDetails } from 'store/actions/routeActions';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { useToggleFavoriteRouteMutation } from 'store/services/favoriteService';
import {
  useDeleteRouteByIdMutation,
  useGetOwnRoutesQuery,
} from 'store/services/routeService';
import type { DetailsDraft } from 'types/components/editDetailsModal';
import { MapScreenProps, OwnRouteSummary } from 'types/map-screen-type';

const EMPTY_ROUTES: OwnRouteSummary[] = [];

/**
 * The saved-routes list and everything you can do to a row of it: rename,
 * publish, share, hand over to Google Maps, delete.
 */
export function useRoutesScreen(navigation: MapScreenProps['navigation']) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const { shareRoute, sharingRouteId } = useShareRoute();
  const { openRouteInGoogleMaps, openingRouteId } = useOpenRouteInGoogleMaps();

  const [editing, setEditing] = useState<OwnRouteSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: routes = EMPTY_ROUTES,
    refetch,
    isFetching,
    isLoading,
    isError,
  } = useGetOwnRoutesQuery(undefined, { skip: !isLoggedIn });

  const [deleteRouteById] = useDeleteRouteByIdMutation();
  const [toggleFavoriteRoute] = useToggleFavoriteRouteMutation();

  const stopCount = useMemo(
    () => routes.reduce((total, route) => total + (route.stopCount ?? 0), 0),
    [routes],
  );

  const handleDeleteRoute = useCallback(
    async (route: OwnRouteSummary) => {
      const confirmed = await confirm({
        title: 'Remove route',
        message: `“${route.title}” leaves your list and stops being shared. Anyone who saved it keeps their copy.`,
        confirmLabel: 'Remove',
        icon: 'trash-outline',
        tone: 'danger',
      });
      if (confirmed) deleteRouteById({ routeId: route.id });
    },
    [confirm, deleteRouteById],
  );

  const handleTogglePublic = useCallback(
    async (route: OwnRouteSummary) => {
      const next = !route.isPublic;

      if (next) {
        const confirmed = await confirm({
          title: 'Share this route',
          message: `“${route.title}” and its stops become visible to everyone, next to your name. You can stop sharing at any time.`,
          confirmLabel: 'Share',
          icon: 'globe-outline',
        });
        if (!confirmed) return;
      }

      await dispatch(
        updateRouteDetails({
          routeId: route.id,
          title: route.title,
          description: route.description,
          isPublic: next,
        }),
      );
    },
    [confirm, dispatch],
  );

  const handleToggleFavorite = useCallback(
    (route: OwnRouteSummary) => {
      toggleFavoriteRoute({ routeId: route.id });
    },
    [toggleFavoriteRoute],
  );

  const handleRefresh = useCallback(() => {
    if (isLoggedIn) refetch();
  }, [isLoggedIn, refetch]);

  const handleView = useCallback(
    (routeId: string) => navigation.navigate('ShowRouteByIdScreen', { routeId }),
    [navigation],
  );

  const handleEdit = useCallback(
    (route: OwnRouteSummary) => setEditing(route),
    [],
  );

  const handleOpenInGoogleMaps = useCallback(
    (route: OwnRouteSummary) => {
      openRouteInGoogleMaps(route.id);
    },
    [openRouteInGoogleMaps],
  );

  const closeEditor = useCallback(() => setEditing(null), []);

  const handleSaveDetails = useCallback(
    async ({ title, description, isPublic }: DetailsDraft) => {
      if (!editing) return;
      setIsSaving(true);

      try {
        await dispatch(
          updateRouteDetails({
            routeId: editing.id,
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
  };
}

export default useRoutesScreen;
