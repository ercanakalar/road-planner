import { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import useConfirm from 'hooks/feedback/useConfirm';
import useLocalMapLogic from 'hooks/map/useLocalMapLogic';
import useStopPair from 'hooks/map/useStopPair';
import { RoutePlace } from 'services/mapsService';
import { reportUsage } from 'services/usageReporter';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { uploadLocalRoutes } from 'store/actions/localRouteActions';
import {
    localRouteCreated,
    localRouteDeleted,
    localRouteDetailsChanged,
    localRouteSelected,
} from 'store/slices/localRouteSlice';
import type { DetailsDraft } from 'types/components/editDetailsModal';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';
import { useTranslation } from 'react-i18next';

const SNAP_RATIOS = [0.22, 0.45, 0.75];

export function useMapScreen() {
    const dispatch = useAppDispatch();
    const confirm = useConfirm();
    const { t } = useTranslation();
    const { height: windowHeight } = useWindowDimensions();

    const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
    const isSavingRoute = useAppSelector(
        (state) => state.localRoute.isUploading,
    );

    const map = useLocalMapLogic();
    const stopPair = useStopPair();

    const {
        activeRoute,
        routes,
        routeLine,
        focusOnPlace,
        handleAddPlaceAsStop,
    } = map;

    const [isReordering, setIsReordering] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    // The route the details editor was opened for, held by id: the active
    // route can change while the editor is open — an upload finishing takes
    // it off the device — and the save must not land on another one. Null
    // means there was no route yet, and saving starts one.
    const [editingRouteId, setEditingRouteId] = useState<string | null>(
        null,
    );
    const [isSearchingRoute, setIsSearchingRoute] = useState(false);
    const [isPickingRoute, setIsPickingRoute] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const openRouteSearch = useCallback(() => setIsSearchingRoute(true), []);
    const closeRouteSearch = useCallback(() => setIsSearchingRoute(false), []);
    const activeRouteId = activeRoute?.id;
    const openDetailsEditor = useCallback(() => {
        setEditingRouteId(activeRouteId ?? null);
        setIsEditingDetails(true);
    }, [activeRouteId]);
    const editingRoute = editingRouteId
        ? routes.find((route) => route.id === editingRouteId)
        : undefined;
    const closeDetailsEditor = useCallback(
        () => setIsEditingDetails(false),
        [],
    );
    const closePicker = useCallback(() => setIsPickingRoute(false), []);
    const openImport = useCallback(() => setIsImporting(true), []);
    const closeImport = useCallback(() => setIsImporting(false), []);

    const handleShowOnMap = useCallback(
        (place: RoutePlace) => {
            setIsSearchingRoute(false);
            focusOnPlace(place);
        },
        [focusOnPlace],
    );

    const handleAddStop = useCallback(
        (place: RoutePlace) => {
            setIsSearchingRoute(false);
            handleAddPlaceAsStop(place);
        },
        [handleAddPlaceAsStop],
    );

    const canSaveRoute = isLoggedIn && (activeRoute?.stops.length ?? 0) > 0;

    const handleSaveRoute = useCallback(() => {
        if (!activeRoute) return;
        dispatch(uploadLocalRoutes({ routeId: activeRoute.id }));
    }, [activeRoute, dispatch]);

    const snapPoints = useMemo(() => {
        const points = SNAP_RATIOS.map((ratio) =>
            Math.round(windowHeight * ratio),
        );
        return Array.from(new Set(points)).sort((a, b) => a - b);
    }, [windowHeight]);

    const summary = useMemo(() => {
        if (routeLine.durationSeconds === undefined) return undefined;
        return {
            duration: secondsToHour(routeLine.durationSeconds),
            distance: metersToDistance(routeLine.distanceMeters),
        };
    }, [routeLine.distanceMeters, routeLine.durationSeconds]);

    // A route with no stops is already a blank slate; starting another one
    // from it would only leave an empty route behind.
    const canStartNewRoute = (activeRoute?.stops.length ?? 0) > 0;

    const handleNewRoute = useCallback(() => {
        if (!canStartNewRoute) return;
        dispatch(
            localRouteCreated(
                t('defaults.numberedRoute', { number: routes.length + 1 }),
            ),
        );
        reportUsage('map_local_route_created');
    }, [canStartNewRoute, dispatch, routes.length, t]);

    const handleSwitchRoute = useCallback(() => {
        if (routes.length > 1) setIsPickingRoute(true);
    }, [routes.length]);

    const handlePickRoute = useCallback(
        (routeId: string) => {
            dispatch(localRouteSelected(routeId));
            setIsPickingRoute(false);
        },
        [dispatch],
    );

    const handleDeleteRoute = useCallback(async () => {
        if (!activeRoute) return;
        const confirmed = await confirm({
            title: t('dialogs.deleteRouteTitle'),
            message: t('dialogs.deleteRouteMessage', {
                title: activeRoute.title,
                count: activeRoute.stops.length,
            }),
            confirmLabel: t('actions.delete'),
            icon: 'trash-outline',
            tone: 'danger',
        });
        if (confirmed) dispatch(localRouteDeleted(activeRoute.id));
    }, [activeRoute, confirm, dispatch, t]);

    const handleSaveDetails = useCallback(
        ({ title, description }: DetailsDraft) => {
            setIsEditingDetails(false);

            if (editingRouteId) {
                // Gone since the editor opened: saved to the account, or
                // deleted. There is nothing left on the device to rename.
                if (!routes.some((route) => route.id === editingRouteId)) {
                    return;
                }
                dispatch(
                    localRouteDetailsChanged({
                        routeId: editingRouteId,
                        title,
                        description,
                    }),
                );
                return;
            }

            // Named before its first stop: the route starts here.
            const { payload: created } = dispatch(
                localRouteCreated(title || t('defaults.myRoute')),
            );
            if (description) {
                dispatch(
                    localRouteDetailsChanged({
                        routeId: created.id,
                        title: created.title,
                        description,
                    }),
                );
            }
            reportUsage('map_local_route_created');
        },
        [dispatch, editingRouteId, routes, t],
    );

    return {
        ...map,
        isLoggedIn,
        stopPair,
        snapPoints,
        summary,
        canSaveRoute,
        isSavingRoute,
        handleSaveRoute,
        sheetGesturesEnabled: !map.draggingStopId && !isReordering,
        setIsReordering,
        isEditingDetails,
        detailsDraft: {
            title: editingRoute?.title,
            description: editingRoute?.description,
        },
        openDetailsEditor,
        closeDetailsEditor,
        handleSaveDetails,
        isSearchingRoute,
        openRouteSearch,
        closeRouteSearch,
        handleShowOnMap,
        handleAddStop,
        isImporting,
        openImport,
        closeImport,
        isPickingRoute,
        handleSwitchRoute,
        handlePickRoute,
        closePicker,
        canStartNewRoute,
        handleNewRoute,
        handleDeleteRoute,
    };
}

export default useMapScreen;
