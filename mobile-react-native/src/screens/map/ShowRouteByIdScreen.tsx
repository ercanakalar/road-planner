import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useGetRoadByIdQuery } from 'store/services/roadService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { RouteProp, useRoute } from '@react-navigation/native';
import MapView, { Polyline, Marker, LongPressEvent } from 'react-native-maps';
import ContextMenu from 'components/ContextMenu';
import {
  addWaypoint,
  deleteWaypoint,
  setSelectedWaypointId,
  setWaypoints,
  updateLocation,
} from 'store/slices/roadSlice';
import { decodePolyline } from 'utils/decodePolyline';
import { showNotification } from 'services/notificationService';
import appConfig from 'constants/appConfig';
import { RootStackParamList, RouteCoordinate, Waypoint, WaypointWithAddress } from 'types/map-screen-type';

type ShowRouteByIdRouteProp = RouteProp<RootStackParamList, 'ShowRouteByIdScreen'>;
const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const ShowRouteByIdScreen = () => {
  const { accessToken } = useAppSelector((state) => state.auth);
  const { roads } = useAppSelector((state) => state.road);
  const route = useRoute<ShowRouteByIdRouteProp>();
  const { routeId } = route.params;
  const dispatch = useAppDispatch();

  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [clickedLocation, setClickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [marker, setMarker] = useState<Waypoint | undefined>(undefined);

  const { data, isLoading, isError }: any = useGetRoadByIdQuery({ accessToken, routeId });

  const orderedWaypoints = useMemo(
    () => [...(data?.wayPoints || [])].sort((a, b) => a.order - b.order),
    [data?.wayPoints]
  );

  useEffect(() => {
    if (
      orderedWaypoints?.length !== roads?.length ||
      !orderedWaypoints.every((wp, i) => wp.id === roads[i]?.id)
    ) {
      dispatch(setWaypoints(orderedWaypoints));
    }
  }, [orderedWaypoints, roads, dispatch]);

  useEffect(() => {
    if (orderedWaypoints.length >= 2) {
      const timeout = setTimeout(() => fetchRoute(), 500);
      return () => clearTimeout(timeout);
    }
  }, [orderedWaypoints]);

  const fetchRoute = useCallback(async () => {
    try {
      const wpString = orderedWaypoints.slice(1, -1)
        .map((p) => `${p.latitude},${p.longitude}`)
        .join('|');
      const origin = `${orderedWaypoints[0].latitude},${orderedWaypoints[0].longitude}`;
      const destination = `${orderedWaypoints.at(-1)?.latitude},${orderedWaypoints.at(-1)?.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${wpString}&key=${REACT_APP_MAP_API_KEY}`;

      const res = await fetch(url).then((res) => res.json());
      const points = res.routes[0]?.overview_polyline?.points;
      if (!points) throw new Error();
      const decoded = decodePolyline(points);
      setRouteCoordinates(decoded);
    } catch {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Failed to fetch directions.',
      });
    }
  }, [orderedWaypoints]);

  const handleMapPress = useCallback((event: LongPressEvent) => {
    const { coordinate } = event.nativeEvent;
    const pressed = orderedWaypoints.find(
      (wp) =>
        Math.abs(wp.latitude - coordinate.latitude) < 0.0001 &&
        Math.abs(wp.longitude - coordinate.longitude) < 0.0001
    );

    if (pressed) {
      setMarker(pressed);
      dispatch(setSelectedWaypointId(pressed.id));
    } else {
      setClickedLocation(coordinate);
      setMarker(undefined);
    }

    setIsContextMenuVisible(true);
  }, [orderedWaypoints, dispatch]);

  const handleAddWaypoint = useCallback(() => {
    if (!clickedLocation) return;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${clickedLocation.latitude},${clickedLocation.longitude}&destination=${clickedLocation.latitude},${clickedLocation.longitude}&waypoints=${clickedLocation.latitude},${clickedLocation.longitude}&key=${REACT_APP_MAP_API_KEY}`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        const address = json.routes?.[0]?.legs?.[0]?.end_address || 'New Location';
        const newWaypoint = {
          id: orderedWaypoints.length + 1,
          latitude: clickedLocation.latitude,
          longitude: clickedLocation.longitude,
          address: address,
          order: orderedWaypoints.length + 1,
        };
        dispatch(addWaypoint(newWaypoint));
        setIsContextMenuVisible(false);
      });
  }, [clickedLocation, orderedWaypoints.length, dispatch]);

  const handleDeleteWaypoint = useCallback(() => {
    if (marker) {
      dispatch(deleteWaypoint(marker));
      setIsContextMenuVisible(false);
    }
  }, [marker, dispatch]);

  const handleNavigateToWaypoint = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMarkerDragEnd = useCallback((event: any) => {
    if (marker && !isContextMenuVisible) {
      const { coordinate } = event.nativeEvent;
      dispatch(updateLocation({ id: marker.id, latitude: coordinate.latitude, longitude: coordinate.longitude }));
      setIsDragging(false);
    }
  }, [marker, isContextMenuVisible, dispatch]);

  const WaypointCard = React.memo(({ wp, index }: { wp: WaypointWithAddress; index: number }) => (
    <View key={wp.id} style={styles.card}>
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

  if (isLoading) return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;
  if (isError || !data) return <Text style={styles.error}>Failed to load route data.</Text>;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.description}>{data.description}</Text>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: orderedWaypoints[0].latitude,
          longitude: orderedWaypoints[0].longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onLongPress={handleMapPress}
        scrollEnabled={!isDragging}
      >
        {orderedWaypoints.map((waypoint) => (
          <Marker
            key={waypoint.id}
            coordinate={{
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
            }}
            title={waypoint.address.address}
            description={`${waypoint.address.district}, ${waypoint.address.province}`}
            draggable={isDragging}
            onDragEnd={handleMarkerDragEnd}
          />
        ))}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeWidth={4}
            strokeColor="blue"
          />
        )}
      </MapView>

      <ContextMenu
        visible={isContextMenuVisible}
        options={[
          ...(marker?.id
            ? [{ label: '🗑 Delete Waypoint', action: handleDeleteWaypoint }]
            : [{ label: '➕ Add Waypoint', action: handleAddWaypoint }]),
          { label: '🧭 Navigate to Waypoint', action: handleNavigateToWaypoint },
        ]}
        onClose={() => setIsContextMenuVisible(false)}
      />

      <ScrollView style={styles.scrollView}>
        <Text style={styles.subheading}>Waypoints:</Text>
        {orderedWaypoints.map((wp, index) => (
          <WaypointCard key={wp.id} wp={wp} index={index} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

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
  error: {
    color: 'red',
    padding: 16,
    fontSize: 16,
  },
});

export default ShowRouteByIdScreen;
