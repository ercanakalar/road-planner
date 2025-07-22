import React, { useRef, useEffect, useState } from 'react';
import { SafeAreaView, ActivityIndicator, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import {
  useAddWaypointMutation,
  useDeleteWaypointByRoadIdMutation,
  useGetRoadByIdQuery,
  useUpdateWaypointByRoadIdMutation,
} from 'store/services/roadService';
import { useRouteManager } from 'hooks/useRouteManager';
import { MapSection } from './MapSection';
import ContextMenu from 'components/ContextMenu';
import {
  ShowRouteByIdRouteProp,
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';
import WaypointCard from './WaypointCard';
import appConfig from 'constants/appConfig';
import { showNotification } from 'services/notificationService';
import { LongPressEvent } from 'react-native-maps';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const ShowRouteByIdScreen = () => {
  const route = useRoute<ShowRouteByIdRouteProp>();
  const { routeId, accessToken } = route.params;

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [clickedLocation, setClickedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | undefined>(
    undefined
  );
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [marker, setMarker] = useState<WaypointWithAddress | undefined>(
    undefined
  );

  const { data, isLoading, refetch } = useGetRoadByIdQuery({
    accessToken,
    routeId,
  }) as {
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

  const handleMapLongPress = (event: LongPressEvent) => {
    if (marker && isDragging) return;

    bottomSheetRef.current?.collapse();
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
        const address =
          json.routes?.[0]?.legs?.[0]?.end_address || 'New Location';
        const addArr = address.split(',');
        const newWaypoint = {
          latitude: clickedLocation.latitude,
          longitude: clickedLocation.longitude,
          address: {
            country: addArr.at(-1)?.trim(),
            province: addArr
              .at(-2)
              ?.split(' ')
              .at(-1)
              ?.split('/')
              .at(-1)
              ?.trim(),
            district: addArr
              .at(-2)
              ?.split(' ')
              .at(-1)
              ?.split('/')
              .at(-2)
              ?.trim(),
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
        const address =
          json.routes?.[0]?.legs?.[0]?.end_address || 'New Location';
        const addArr = address.split(',');
        const updatedWaypoint = {
          latitude,
          longitude,
          address: {
            country: addArr.at(-1)?.trim(),
            province: addArr
              .at(-2)
              ?.split(' ')
              .at(-1)
              ?.split('/')
              ?.at(-1)
              ?.trim(),
            district: addArr
              .at(-2)
              ?.split(' ')
              .at(-1)
              ?.split('/')
              ?.at(-2)
              ?.trim(),
            address,
          },
          order: marker?.order || 0,
        };

        updateWaypoint({
          accessToken,
          routeId,
          waypointId,
          waypoint: updatedWaypoint,
        })
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
      <SafeAreaView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size='large' color='#007AFF' />
        <Text>Loading route...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            padding: 16,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderColor: '#eee',
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '600' }}>{data.title}</Text>
          <Text style={{ fontSize: 14, color: '#777', marginTop: 4 }}>
            {data.description}
          </Text>
        </View>

        <MapSection
          waypoints={data.wayPoints}
          isDragging={isDragging}
          selectedMarkerId={selectedMarkerId}
          routeCoordinates={routeCoordinates}
          handleMarkerDragEnd={handleMarkerDragEnd}
          onMapLongPress={handleMapLongPress}
        />

        <ContextMenu
          visible={isContextMenuVisible}
          options={contextMenuOptions}
          onClose={() => setIsContextMenuVisible(false)}
        />
      </SafeAreaView>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['20%', '40%', '90%']}
        index={1}
        enablePanDownToClose={false}
        enableContentPanningGesture={!isDragging}
        enableHandlePanningGesture={!isDragging}
      >
        <BottomSheetFlatList<WaypointWithAddress>
          data={data.wayPoints}
          keyboardShouldPersistTaps='handled'
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WaypointCard
              wp={item}
              order={item.order}
              onEdit={() => {
                setSelectedMarkerId(item.id);
                setIsDragging(true);
              }}
              onDelete={() => {
                deleteWaypointByRoadId({
                  accessToken,
                  routeId,
                  waypointId: item.id,
                })
                  .unwrap()
                  .then(() => refetch());
              }}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        />
      </BottomSheet>
    </>
  );
};

export default ShowRouteByIdScreen;
