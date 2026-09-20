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
import { useTranslation } from 'react-i18next';

const EMPTY_ROUTES: OwnRouteSummary[] = [];

export function useRoutesScreen(navigation: MapScreenProps['navigation']) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { t } = useTranslation();

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
    () => routes.reduce((total, route) => total + (route._count.stops ?? 0), 0),
    [routes],
  );

  const handleDeleteRoute = useCallback(
    async (route: OwnRouteSummary) => {
      const confirmed = await confirm({
        title: t('dialogs.removeRouteTitle'),
        message: t('dialogs.removeRouteMessage', { title: route.title }),
        confirmLabel: t('actions.remove'),
        icon: 'trash-outline',
        tone: 'danger',
      });
      if (confirmed) deleteRouteById({ routeId: route.id });
    },
    [confirm, deleteRouteById, t],
  );

  const handleTogglePublic = useCallback(
    async (route: OwnRouteSummary) => {
      const next = !route.isPublic;

      if (next) {
        const confirmed = await confirm({
          title: t('dialogs.shareRouteTitle'),
          message: t('dialogs.shareRouteMessage', { title: route.title }),
          confirmLabel: t('actions.share'),
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
          header: t('toast.couldNotSave'),
          message: t('toast.changesNotAppliedRetry'),
        });
      } finally {
        setIsSaving(false);
      }
    },
    [dispatch, editing, t],
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
