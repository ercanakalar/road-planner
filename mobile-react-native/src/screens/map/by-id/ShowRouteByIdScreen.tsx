import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  GestureResponderEvent,
} from 'react-native';
import {
  useAddWaypointMutation,
  useDeleteWaypointByRoadIdMutation,
  useGetRoadByIdQuery,
  useUpdateWaypointByRoadIdMutation,
} from 'store/services/roadService';
import { useRoute } from '@react-navigation/native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import ContextMenu from 'components/ContextMenu';

import { decodePolyline } from 'utils/decodePolyline';
import { showNotification } from 'services/notificationService';
import appConfig from 'constants/appConfig';
import {
  RouteCoordinate,
  ShowRouteByIdRouteProp,
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const ShowRouteByIdScreen = () => {
  const route = useRoute<ShowRouteByIdRouteProp>();
  const { routeId, accessToken } = route.params;

  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [clickedLocation, setClickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | undefined>(undefined);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [marker, setMarker] = useState<WaypointWithAddress | undefined>(undefined);

  const { data, isLoading, refetch } = useGetRoadByIdQuery({ accessToken, routeId }) as {
    data?: WaypointWithAddressAndId;
    isLoading: boolean;
    refetch: () => void;
  };

  const [addWaypoint] = useAddWaypointMutation();
  const [deleteWaypointByRoadId] = useDeleteWaypointByRoadIdMutation();
  const [updateWaypoint] = useUpdateWaypointByRoadIdMutation();

  const lastRouteHashRef = useRef<string | null>(null);
  const routeCacheRef = useRef<Map<string, RouteCoordinate[]>>(new Map());

  const getWaypointHash = (wps: WaypointWithAddress[]) =>
    wps.map(wp => `${wp.latitude},${wp.longitude}`).join('|');

  const fetchRoute = async (waypoints: WaypointWithAddress[]) => {
    const hash = getWaypointHash(waypoints);

    if (lastRouteHashRef.current === hash) return;
    if (routeCacheRef.current.has(hash)) {
      setRouteCoordinates(routeCacheRef.current.get(hash)!);
      lastRouteHashRef.current = hash;
      return;
    }

    try {
      const wpString = waypoints.slice(1, -1)
        .map((p) => `${p.latitude},${p.longitude}`)
        .join('|');
      const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
      const destination = `${waypoints.at(-1)?.latitude},${waypoints.at(-1)?.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${wpString}&key=${REACT_APP_MAP_API_KEY}`;

      const res = await fetch(url).then((res) => res.json());
      const points = res.routes[0]?.overview_polyline?.points;
      if (!points) throw new Error();
      const decoded = decodePolyline(points);

      routeCacheRef.current.set(hash, decoded);
      lastRouteHashRef.current = hash;
      setRouteCoordinates(decoded);
    } catch {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Failed to fetch directions.',
      });
    }
  };

  useEffect(() => {
    if (data?.wayPoints && data.wayPoints.length >= 2) {
      fetchRoute(data.wayPoints);
    }
  }, [data?.wayPoints]);

  if (isLoading || !data || !data.wayPoints || data.wayPoints.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading route...</Text>
      </SafeAreaView>
    );
  }

  const handleMapPress = (event: any) => {
    if (marker && isDragging) {
      return;
    }
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
            country: addArr.at(-1),
            province: addArr.at(-2).split(' ').at(-1).split('/').at(-1),
            district: addArr.at(-2).split(' ').at(-1).split('/').at(-2),
            address: address,
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
    deleteWaypointByRoadId({
      accessToken,
      routeId,
      waypointId: marker.id,
    })
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

  // const handleMarkerDragEnd = (event: any, waypointId: string) => {
  //   const { latitude, longitude } = event.nativeEvent.coordinate;

  //   if (!selectedMarkerId || selectedMarkerId !== waypointId) return;

  //   console.log('Updated location:', latitude, longitude);

  //   setIsDragging(false);
  //   setSelectedMarkerId(undefined);
  //   setMarker(undefined);
  // };
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.description}>{data.description}</Text>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: data.wayPoints[0].latitude,
          longitude: data.wayPoints[0].longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onLongPress={handleMapPress}
        scrollEnabled={!isDragging}
      >
        {data.wayPoints.map((waypoint) => (
          <Marker
            key={waypoint.id}
            coordinate={{
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
            }}
            title={waypoint.address.address}
            description={`${waypoint.address.district}, ${waypoint.address.province}`}
            draggable={isDragging}
            onDragEnd={(e) => handleMarkerDragEnd(e, waypoint.id)}
            pinColor={selectedMarkerId === waypoint.id ? 'orange' : undefined}

          />
        ))}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates.map(p => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeWidth={4}
            strokeColor="blue"
          />
        )}
      </MapView>

      <ContextMenu
        visible={isContextMenuVisible}
        options={contextMenuOptions}
        onClose={() => setIsContextMenuVisible(false)}
      />

      <ScrollView style={styles.scrollView}>
        <Text style={styles.subheading}>Waypoints:</Text>
        {data.wayPoints.map((wp, index) => (
          <WaypointCard key={wp.id} wp={wp} index={index} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const WaypointCard = React.memo(({ wp, index }: { wp: WaypointWithAddress; index: number }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>
      {index + 1}. {wp.address?.address}
    </Text>
    <Text style={styles.cardText}>
      {wp.address?.district}, {wp.address?.province}
    </Text>
    <Text style={styles.cardText}>
      📍 {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
    </Text>
  </View>
));

const styles = StyleSheet.create({
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.45,
  },
  scrollView: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    padding: 16,
    backgroundColor: '#fff',
  },
  description: {
    fontSize: 16,
    color: '#555',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
  },
});

export default ShowRouteByIdScreen;
