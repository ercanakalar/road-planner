import { useCallback, useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import MapView from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';

import { useRouteManager } from 'hooks/useRouteManager';
import {
    useAddWaypointMutation,
    useDeleteWaypointByIdMutation,
    useUpdateWaypointByIdMutation,
    useGetRoadByIdQuery,
    roadService,
} from 'store/services/roadService';
import { ShowRouteByIdRouteProp, WaypointWithAddress, WaypointWithAddressAndId } from 'types/map-screen-type';
import { showNotification } from 'services/notificationService';
import { getAddressFromLatLng } from 'services/googleService';
import {
    MapLongPressEvent,
    MarkerDragEndEvent,
    OnPlaceSelected,
    UpdatedWaypoint,
} from 'types/hooks/useMapLogic-type';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
    setClickedLocation,
    setContextMenuVisible,
    setIsDragging,
    setMarker,
    setSelectedMarkerId,
} from 'store/slices/mapSlice';

const COORD_THRESHOLD = 0.0001;

const useMapLogic = () => {
    const { params } = useRoute<ShowRouteByIdRouteProp>();
    const { accessToken, roadId } = params;
    const dispatch = useAppDispatch();

    const mapRef = useRef<MapView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const {
        clickedLocation,
        selectedMarkerId,
        isContextMenuVisible,
        marker,
        isDragging,
    } = useAppSelector((state) => state.map);


    const { data, isLoading } = useGetRoadByIdQuery(
        { accessToken, roadId },
        { skip: !accessToken },
    ) as { data?: WaypointWithAddressAndId; isLoading: boolean };

    const waypoints = data?.wayPoints ?? [];
    
    const [addWaypoint] = useAddWaypointMutation();
    const [deleteWaypoint] = useDeleteWaypointByIdMutation();
    const [updateWaypoint] = useUpdateWaypointByIdMutation();

    const { fetchRoute, routeCoordinates } = useRouteManager();

    useEffect(() => {
        if (waypoints.length >= 2) {
            fetchRoute(waypoints);
        }
    }, [waypoints, fetchRoute]);

    const patchCache = useCallback(
        (updater: (draft: WaypointWithAddressAndId) => void) =>
            dispatch(
                roadService.util.updateQueryData(
                    'getRoadById',
                    { accessToken, roadId },
                    (draft: unknown) => {
                        updater(draft as WaypointWithAddressAndId);
                    },
                ),
            ),
        [dispatch, accessToken, roadId],
    );

    const handleMapLongPress = useCallback(
        (event: MapLongPressEvent) => {
            if (marker && isDragging) return;
            bottomSheetRef.current?.collapse();

            const { coordinate } = event.nativeEvent;
            const pressed = waypoints.find(
                (wp) =>
                    Math.abs(wp.latitude - coordinate.latitude) < COORD_THRESHOLD &&
                    Math.abs(wp.longitude - coordinate.longitude) < COORD_THRESHOLD,
            );

            dispatch(setMarker(pressed ?? undefined));
            dispatch(setClickedLocation(pressed ? undefined : coordinate));
            dispatch(setContextMenuVisible(true));
        },
        [dispatch, marker, isDragging, waypoints],
    );

    const handleAddWaypoint = useCallback(async () => {
        if (!clickedLocation) return;

        const address = await getAddressFromLatLng(clickedLocation);
        const newWaypoint = {
            latitude: clickedLocation.latitude,
            longitude: clickedLocation.longitude,
            order: waypoints.length + 1,
            address,
        };
        const patch = patchCache((draft) => {
            draft.wayPoints.push({
                id: 'temp-id',
                favoriteWaypoints: [],
                roadId: roadId,
                addressInfoId: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...newWaypoint,
                address: {
                    id: 'temp-address-id',
                    ...(newWaypoint.address || {}),
                },
            });
        });

        try {
            await addWaypoint({ accessToken, roadId: roadId, waypoint: newWaypoint }).unwrap();

        } catch (error) {
            patch.undo();
            console.log(error);

            showNotification({ type: 'error', header: 'Error', message: 'Failed to add waypoint.' });
        } finally {
            const updatedWaypoints = [...waypoints, newWaypoint as WaypointWithAddress];
            if (updatedWaypoints.length >= 2) {
                fetchRoute(updatedWaypoints);
            }
            dispatch(setContextMenuVisible(false));
        }
    }, [accessToken, roadId, clickedLocation, waypoints.length, addWaypoint, patchCache, dispatch]);

    const handleDeleteWaypoint = useCallback(async () => {
        if (!marker) return;

        const patch = patchCache((draft) => {
            draft.wayPoints = draft.wayPoints.filter((wp) => wp.id !== marker.id);
        });

        try {
            await deleteWaypoint({
                accessToken,
                roadId: roadId,
                waypointId: marker.id,
            }).unwrap();

            const updatedWaypoints = waypoints.filter((wp) => wp.id !== marker.id);
            if (updatedWaypoints.length >= 2) {
                fetchRoute(updatedWaypoints);
            }
        } catch {
            patch.undo();
            showNotification({
                type: 'error',
                header: 'Error',
                message: 'Failed to delete waypoint.',
            });
        } finally {
            dispatch(setContextMenuVisible(false));
        }
    }, [accessToken, roadId, marker, waypoints, deleteWaypoint, patchCache, fetchRoute, dispatch]);

    const handleMarkerDragEnd = useCallback(
        async (event: MarkerDragEndEvent, waypointId: string): Promise<void> => {
            if (!selectedMarkerId || selectedMarkerId !== waypointId) return;

            const { latitude, longitude } = event.nativeEvent.coordinate;
            const address = await getAddressFromLatLng({ latitude, longitude });

            const updatedWaypoint: UpdatedWaypoint = {
                latitude,
                longitude,
                address: address.address,
                order: marker?.order ?? 0,
            };

            const patch = patchCache((draft) => {
                const target = draft.wayPoints.find((wp) => wp.id === waypointId);
                if (target) {
                    target.latitude = latitude;
                    target.longitude = longitude;
                }
            });

            try {
                await updateWaypoint({
                    accessToken,
                    roadId,
                    waypointId,
                    waypoint: updatedWaypoint,
                }).unwrap();
            } catch {
                patch.undo();
                showNotification({ type: 'error', header: 'Error', message: 'Failed to update waypoint location.' });
            } finally {
                dispatch(setIsDragging(false));
                dispatch(setSelectedMarkerId(undefined));
                dispatch(setMarker(undefined));
            }
        },
        [accessToken, roadId, selectedMarkerId, marker, updateWaypoint, patchCache, dispatch],
    );

    const handleNavigateToWaypoint = useCallback(() => {
        if (!marker) return;
        dispatch(setSelectedMarkerId(marker.id));
        dispatch(setIsDragging(true));
        dispatch(setContextMenuVisible(false));
    }, [dispatch, marker]);

    const onPlaceSelected = useCallback<OnPlaceSelected>(
        (location) => {
            mapRef.current?.animateToRegion(
                {
                    latitude: location.lat,
                    longitude: location.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                },
                1000,
            );
            dispatch(setClickedLocation({ latitude: location.lat, longitude: location.lng }));
        },
        [dispatch],
    );


    const contextMenuProps = {
        visible: isContextMenuVisible,
        options: [
            ...(marker?.id
                ? [{ label: '🗑 Delete Waypoint', action: handleDeleteWaypoint }, { label: '🧭 Navigate to Waypoint', action: handleNavigateToWaypoint }]
                : [{ label: '➕ Add Waypoint', action: handleAddWaypoint }]),
            ,
        ],
        onClose: () => dispatch(setContextMenuVisible(false)),
    };

    return {
        roadId,
        mapRef,
        bottomSheetRef,
        isLoading,
        data,
        isDragging,
        contextMenuProps,
        markerLogic: { selectedMarkerId, routeCoordinates },
        onPlaceSelected,
        handleMarkerDragEnd,
        handleMapLongPress,
    };
};

export default useMapLogic;