import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useGetRoadByIdQuery } from 'store/services/roadService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { RouteProp, useRoute } from '@react-navigation/native';
import {
  RootStackParamList,
  RouteCoordinate,
  Waypoint,
} from 'types/map-screen-type';
import MapView, { Polyline, Marker, LongPressEvent } from 'react-native-maps';
import ContextMenu from 'components/ContextMenu';
import {
  addWaypoint,
  deleteWaypoint,
  setSelectedWaypointId,
  updateLocation,
} from 'store/slices/roadSlice';
import { RouteLeg } from 'types/road';
import { showNotification } from 'services/notificationService';
import { decodePolyline } from 'utils/decodePolyline';
import appConfig from 'constants/appConfig';

type ShowRouteByIdRouteProp = RouteProp<
  RootStackParamList,
  'ShowRouteByIdScreen'
>;

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const ShowRouteByIdScreen = () => {
  const { accessToken } = useAppSelector((state) => state.auth);
  const route = useRoute<ShowRouteByIdRouteProp>();
  const { routeId } = route.params;
  const dispatch = useAppDispatch();
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>(
    []
  );
  const [clickedLocation, setClickedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [marker, setMarker] = useState<Waypoint | undefined>(undefined);

  const { data, isLoading, isError }: any = useGetRoadByIdQuery({
    accessToken,
    routeId,
  });

  console.log(data?.wayPoints);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (data?.wayPoints?.length < 2) return;
    if (data?.wayPoints) {
      timeout = setTimeout(() => {
        fetchRoute();
      }, 600);
    }
    return () => clearTimeout(timeout);
  }, [data?.wayPoints]);

  const fetchRoute = async () => {
    try {
      const waypointsString = data?.wayPoints
        .slice(1, -1)
        .map((point: any) => `${point.lat},${point.lon}`)
        .join('|');

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${
        data?.wayPoints[0].lat
      },${data?.wayPoints[0].lon}&destination=${data?.wayPoints.at(-1)?.lat},${
        data?.wayPoints.at(-1)?.lon
      }&waypoints=optimize:true|${waypointsString}&key=${REACT_APP_MAP_API_KEY}`;

      fetch(url).then(async (data) => {
        const res = await data?.json();
        const overviewPolyline = res.routes[0].overview_polyline.points;
        const decodedPoints = decodePolyline(overviewPolyline);
        setRouteCoordinates(decodedPoints);
      });
    } catch (error) {
      showNotification({
        type: 'error',
        header: 'Error',
        message: 'Failed to fetch directions. Please try again later.',
      });
    }
  };

  const handleMapPress = (event: LongPressEvent) => {
    const { coordinate } = event.nativeEvent;

    const pressedMarker = data?.wayPoints.find(
      (waypoint: any) =>
        Math.abs(waypoint.latitude - coordinate.latitude) < 0.0001 &&
        Math.abs(waypoint.longitude - coordinate.longitude) < 0.0001
    );

    if (pressedMarker) {
      setMarker(pressedMarker);
      setIsContextMenuVisible(true);
      dispatch(setSelectedWaypointId(pressedMarker.id));
    } else {
      setMarker(undefined);
      setClickedLocation(coordinate);
      setIsContextMenuVisible(true);
    }
  };
  const handleMarkerDragEnd = (event: any) => {
    if (isContextMenuVisible) {
      setIsDragging(false);
      return;
    }
    const { coordinate } = event.nativeEvent;
    setClickedLocation(coordinate);
    dispatch(
      updateLocation({
        id: marker!.id,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      })
    );
    setIsDragging(false);
  };
  const handleAddWaypoint = () => {
    if (clickedLocation) {
      addLocation(clickedLocation);
    }
  };

  const handleNavigateToWaypoint = () => {
    setIsDragging(true);
  };

  const handleDeleteWaypoint = () => {
    if (marker) {
      dispatch(deleteWaypoint(marker));
      setIsContextMenuVisible(false);
    } else {
    }
  };

  const addLocation = (coordinate: { latitude: number; longitude: number }) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${coordinate.latitude},${coordinate.longitude}&destination=${coordinate.latitude},${coordinate.longitude}&waypoints=${coordinate.latitude},${coordinate.longitude}&key=${REACT_APP_MAP_API_KEY}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const overviewPolyline = data?.routes[0].overview_polyline.points;

        const address = data?.routes[0].legs.map((leg: RouteLeg) => {
          return leg.end_address;
        });
        if (address.length === 0) {
          showNotification({
            type: 'error',
            header: 'Error',
            message: 'No address found for the selected location.',
          });
          return;
        }
        const newWaypoint = {
          id: data.wayPoints.length + 1,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          address: address[0],
          order: data.wayPoints.length + 1,
        };
        dispatch(addWaypoint(newWaypoint));
        const decodedPoints = decodePolyline(overviewPolyline);
        setRouteCoordinates(decodedPoints);
      });
  };

  if (isLoading) {
    return <ActivityIndicator size='large' color='#007AFF' />;
  }

  if (isError || !data) {
    return <Text style={styles.error}>Failed to load route data?.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{data!.title!}</Text>
      <Text style={styles.description}>{data!.description}</Text>

      {/* <View style={styles.container}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: data!.wayPoints![0].latitude,
            longitude: data!.wayPoints![0].longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          onLongPress={handleMapPress}
          scrollEnabled={!isDragging}
        >
          {Array.isArray(data!.wayPoints!) &&
            data!.wayPoints!.length > 0 &&
            data!.wayPoints!.map((waypoint: Waypoint, index: number) => (
              <Marker
                id={waypoint.id.toString()}
                key={`Waypoint ${index + 1}`}
                coordinate={waypoint}
                title={waypoint.address}
                draggable={isDragging}
                onDragEnd={handleMarkerDragEnd}
              ></Marker>
            ))}

          {Array.isArray(routeCoordinates) && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={5}
              strokeColor='blue'
            />
          )}
        </MapView>
        <ContextMenu
          visible={isContextMenuVisible}
          options={[
            ...(marker?.id
              ? [{ label: 'Delete Waypoint', action: handleDeleteWaypoint }]
              : [{ label: 'Add Waypoint', action: handleAddWaypoint }]),
            { label: 'Navigate to Waypoint', action: handleNavigateToWaypoint },
          ]}
          onClose={() => setIsContextMenuVisible(false)}
        />
      </View> */}
      <Text style={styles.subheading}>Waypoints:</Text>
      {data!.wayPoints!.map((wp: any, index: number) => (
        <Text key={index}>{`Lat: ${wp.lat}, Lon: ${wp.lon}`}</Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  subheading: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  error: {
    color: 'red',
    padding: 16,
  },
});

export default ShowRouteByIdScreen;
