import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  ActivityIndicator,
  GestureResponderEvent,
  View,
} from 'react-native';

import { useRoute } from '@react-navigation/native';
import { useAddWaypointMutation, useDeleteWaypointByRoadIdMutation, useGetRoadByIdQuery, useUpdateWaypointByRoadIdMutation } from 'store/services/roadService';

import { useRouteManager } from 'hooks/useRouteManager';
import { MapSection } from './MapSection';
import { WaypointList } from './WaypointList';
import ContextMenu from 'components/ContextMenu';
import { showNotification } from 'services/notificationService';
import appConfig from 'constants/appConfig';

import { ShowRouteByIdRouteProp, WaypointWithAddress, WaypointWithAddressAndId } from 'types/map-screen-type';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const ShowRouteByIdScreen = () => {
  const route = useRoute<ShowRouteByIdRouteProp>();
  const { routeId, accessToken } = route.params;

  const [clickedLocation, setClickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | undefined>(undefined);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [marker, setMarker] = useState<WaypointWithAddress | undefined>(undefined);

  const { data, isLoading, refetch } = useGetRoadByIdQuery({ accessToken, routeId }) as {
    data: WaypointWithAddressAndId;
    isLoading: boolean;
    refetch: () => void;
  };

  const [addWaypoint] = useAddWaypointMutation();
  const [deleteWaypointByRoadId] = useDeleteWaypointByRoadIdMutation();
  const [updateWaypoint] = useUpdateWaypointByRoadIdMutation();

  const { routeCoordinates, fetchRoute } = useRouteManager();

  useEffect(() => {
    if (data?.wayPoints && data.wayPoints.length >= 2) {
      fetchRoute(data.wayPoints);
    }
  }, [data?.wayPoints]);

  const handleMapPress = (event: any) => {
    if (marker && isDragging) return;
    const { coordinate } = event.nativeEvent;
    const pressed = data.wayPoints.find(
      (wp) =>
        Math.abs(wp.latitude - coordinate.latitude) < 0.0001 &&
        Math.abs(wp.longitude - coordinate.longitude) < 0.0001
    );
    setMarker(pressed || undefined);
    setClickedLocation(pressed ? null : coordinate);
    setIsContextMenuVisible(true);
  };

  const handleAddWaypoint = () => {
    if (!clickedLocation) return;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${clickedLocation.latitude},${clickedLocation.longitude}&destination=${clickedLocation.latitude},${clickedLocation.longitude}&waypoints=${clickedLocation.latitude},${clickedLocation.longitude}&key=${REACT_APP_MAP_API_KEY}`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        const address = json.routes?.[0]?.legs?.[0]?.end_address || 'New Location';
        const addArr = address.split(',');
        const newWaypoint = {
          latitude: clickedLocation.latitude,
          longitude: clickedLocation.longitude,
          address: {
            country: addArr.at(-1)?.trim(),
            province: addArr.at(-2)?.split(' ').at(-1)?.split('/').at(-1)?.trim(),
            district: addArr.at(-2)?.split(' ').at(-1)?.split('/').at(-2)?.trim(),
            address,
          },
          order: data.wayPoints.length + 1,
        };
        addWaypoint({ accessToken, routeId, waypoint: newWaypoint })
          .unwrap()
          .then(() => refetch());
        setIsContextMenuVisible(false);
      });
  };

  const handleDeleteWaypoint = () => {
    if (!marker) return;

    setIsContextMenuVisible(false);
    deleteWaypointByRoadId({ accessToken, routeId, waypointId: marker.id })
      .unwrap()
      .then(() => refetch());
  };

  const handleNavigateToWaypoint = () => {
    if (marker) {
      setSelectedMarkerId(marker.id);
      setIsDragging(true);
      setIsContextMenuVisible(false);
    }
  };

  const handleMarkerDragEnd = (event: any, waypointId: string) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    if (!selectedMarkerId || selectedMarkerId !== waypointId) return;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${latitude},${longitude}&destination=${latitude},${longitude}&waypoints=${latitude},${longitude}&key=${REACT_APP_MAP_API_KEY}`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        const address = json.routes?.[0]?.legs?.[0]?.end_address || 'New Location';
        const addArr = address.split(',');
        const updatedWaypoint = {
          latitude,
          longitude,
          address: {
            country: addArr.at(-1)?.trim(),
            province: addArr.at(-2)?.split(' ').at(-1)?.split('/')?.at(-1)?.trim(),
            district: addArr.at(-2)?.split(' ').at(-1)?.split('/')?.at(-2)?.trim(),
            address,
          },
          order: marker?.order || 0,
        };

        updateWaypoint({ accessToken, routeId, waypointId, waypoint: updatedWaypoint })
          .unwrap()
          .then(() => {
            setIsDragging(false);
            setSelectedMarkerId(undefined);
            setMarker(undefined);
            refetch();
          });
      })
      .catch(() => {
        showNotification({
          type: 'error',
          header: 'Error',
          message: 'Failed to update waypoint location.',
        });
      });
  };

  const contextMenuOptions = [
    ...(marker?.id
      ? [{ label: '🗑 Delete Waypoint', action: handleDeleteWaypoint }]
      : [{ label: '➕ Add Waypoint', action: handleAddWaypoint }]),
    { label: '🧭 Navigate to Waypoint', action: handleNavigateToWaypoint },
  ];

  if (isLoading || !data || !data.wayPoints || data.wayPoints.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading route...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', padding: 16, backgroundColor: '#fff' }}>{data.title}</Text>
      <Text style={{ fontSize: 16, color: '#555', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff' }}>{data.description}</Text>

      <MapSection
        waypoints={data.wayPoints}
        isDragging={isDragging}
        selectedMarkerId={selectedMarkerId}
        routeCoordinates={routeCoordinates}
        handleMarkerDragEnd={handleMarkerDragEnd}
        onMapPress={handleMapPress}
      />


      <ContextMenu
        visible={isContextMenuVisible}
        options={contextMenuOptions}
        onClose={() => setIsContextMenuVisible(false)}
      />

      <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f9f9f9', marginBottom: 50 }}>
        <WaypointList waypoints={data.wayPoints} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ShowRouteByIdScreen;
