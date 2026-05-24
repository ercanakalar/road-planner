import { useEffect, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import MapView from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';

import { useRouteManager } from 'hooks/useRouteManager';
import {
    useAddWaypointMutation,
    useGetRoadByIdQuery,
    useUpdateWaypointByIdMutation,
} from 'store/services/roadService';
import { ShowRouteByIdRouteProp, WaypointWithAddress } from 'types/map-screen-type';
import { showNotification } from 'services/notificationService';
import { getAddressFromLatLng } from 'services/googleService';
import { MapLongPressEvent, MarkerDragEndEvent, OnPlaceSelected, UpdatedWaypoint } from 'types/hooks/useMapLogic-type';
import { useAppDispatch } from 'store/hook';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { setClickedLocation, setContextMenuVisible, setIsDragging, setMarker, setSelectedMarkerId } from 'store/slices/mapSlice';

const useMapLogic = () => {
    const { params } = useRoute<ShowRouteByIdRouteProp>();
    const { accessToken, routeId } = params;

    const dispatch = useAppDispatch();

    const mapRef = useRef<MapView>(undefined);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const {
        clickedLocation,
        selectedMarkerId,
        isContextMenuVisible,
        marker,
        isDragging,
    } = useSelector((state: RootState) => state.map);

    const { data, isLoading, refetch } = useGetRoadByIdQuery({ accessToken, roadId: routeId }) as {
        data: {
            wayPoints: WaypointWithAddress[];
        };
        isLoading: boolean;
        refetch: () => void;
    };
    const [addWaypoint] = useAddWaypointMutation();
    const [deleteWaypoint] = useUpdateWaypointByIdMutation();
    const [updateWaypoint] = useUpdateWaypointByIdMutation();

    const { fetchRoute, routeCoordinates } = useRouteManager();

    useEffect(() => {
        if (data?.wayPoints?.length >= 2) {
            fetchRoute(data.wayPoints);
        }
    }, [data?.wayPoints]);

    const handleMapLongPress = (event: MapLongPressEvent) => {
        if (marker && isDragging) return;

        bottomSheetRef.current?.collapse();
        const { coordinate } = event.nativeEvent;

        const pressed: WaypointWithAddress | undefined = data.wayPoints.find(
            (wp: WaypointWithAddress) =>
                Math.abs(wp.latitude - coordinate.latitude) < 0.0001 &&
                Math.abs(wp.longitude - coordinate.longitude) < 0.0001
        );

        dispatch(setMarker(pressed || undefined));
        dispatch(setClickedLocation(pressed ? undefined : coordinate));
        dispatch(setContextMenuVisible(true));
    };

    const handleAddWaypoint = async () => {
        if (!clickedLocation) return;
        const address = await getAddressFromLatLng(clickedLocation);

        const newWaypoint = {
            latitude: clickedLocation.latitude,
            longitude: clickedLocation.longitude,
            address,
            order: data?.wayPoints.length + 1,
        };

        await addWaypoint({ accessToken, routeId, waypoint: newWaypoint });
        refetch();
        dispatch(setContextMenuVisible(false));
    };

    const handleDeleteWaypoint = async () => {
        if (!marker) return;
        await deleteWaypoint({ accessToken, routeId, waypointId: marker.id });
        refetch();
        dispatch(setContextMenuVisible(false));
    };

    const handleMarkerDragEnd = async (
        event: MarkerDragEndEvent,
        waypointId: string
    ): Promise<void> => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        if (!selectedMarkerId || selectedMarkerId !== waypointId) return;

        const address = await getAddressFromLatLng({ latitude, longitude });

        const updatedWaypoint: UpdatedWaypoint = {
            latitude,
            longitude,
            address: address.address,
            order: marker?.order || 0,
        };

        try {
            await updateWaypoint({ accessToken, roadId: routeId, waypointId, waypoint: updatedWaypoint });
            refetch();
        } catch {
            showNotification({
                type: 'error',
                header: 'Error',
                message: 'Failed to update waypoint location.',
            });
        } finally {
            dispatch(setIsDragging(false));
            dispatch(setSelectedMarkerId(undefined));
            dispatch(setMarker(undefined));
        }
    };

    const handleNavigateToWaypoint = () => {
        if (marker) {
            dispatch(setSelectedMarkerId(marker.id));
            dispatch(setIsDragging(true));
            dispatch(setContextMenuVisible(false));
        }
    };

    const contextMenuProps = {
        visible: isContextMenuVisible,
        options: [
            ...(marker?.id
                ? [{ label: '🗑 Delete Waypoint', action: handleDeleteWaypoint }]
                : [{ label: '➕ Add Waypoint', action: handleAddWaypoint }]),
            { label: '🧭 Navigate to Waypoint', action: handleNavigateToWaypoint },
        ],
        onClose: () => dispatch(setContextMenuVisible(false)),
    };


    const onPlaceSelected: OnPlaceSelected = (location, address) => {
        mapRef.current?.animateToRegion(
            {
                latitude: location.lat,
                longitude: location.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            },
            1000
        );
        dispatch(setClickedLocation({ latitude: location.lat, longitude: location.lng }));
    };

    return {
        routeId,
        mapRef,
        bottomSheetRef,
        isLoading,
        data,
        isDragging,
        contextMenuProps,
        markerLogic: {
            selectedMarkerId,
            routeCoordinates,
        },
        onPlaceSelected,
        handleMarkerDragEnd,
        handleMapLongPress,
    };
};

export default useMapLogic;
