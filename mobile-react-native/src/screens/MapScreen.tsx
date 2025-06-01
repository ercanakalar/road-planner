import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, MapPressEvent } from 'react-native-maps';
import polyline from '@mapbox/polyline';

import {
  MapScreenProps,
  Route,
  RouteCoordinate,
  Waypoint,
} from 'types/map-screen-type';
import { MapState, RouteLeg } from 'types/map';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { addWaypoint } from 'store/slices/mapSlice';

const MapScreen = ({ navigation }: MapScreenProps) => {
  const dispatch = useAppDispatch();
  const waypoints = useAppSelector((state: { map: MapState }) => state.map.wayPoints);

  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [clickedLocation, setClickedLocation] = useState<{ latitude: number, longitude: number } | null>(null);


  const destination = { latitude: 40.0689064, longitude: 32.5902646 };

  const decodePolyline = (encoded: string) => {
    const decodedPoints = polyline.decode(encoded);
    const coordinates = decodedPoints.map((point: any) => ({
      latitude: point[0],
      longitude: point[1],
    }));
    return coordinates;
  };

  const fetchRoute = async () => {
    try {
      const waypointsString = waypoints
        .map((point) => `${point.latitude},${point.longitude}`)
        .join('|');

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${waypoints[0].latitude},${waypoints[0].longitude}&destination=${destination.latitude},${destination.longitude}&waypoints=${waypointsString}&key=${process.env.REACT_APP_MAP_API}`;

      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const overviewPolyline = data.routes[0].overview_polyline.points;

          // data.routes[0].legs.forEach((leg: RouteLeg) => {
          //   console.log(leg.end_address);
          // });

          const decodedPoints = decodePolyline(overviewPolyline);
          setRouteCoordinates(decodedPoints);
        });
    } catch (error) {
      console.error('Error fetching directions:', error);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [waypoints]);

  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('focus', () => {
  //     const state = navigation.getState();
  //     const routeWithWaypoint = state.routes.find(
  //       (route: Route) => route.params?.newWaypoint
  //     ) as Route | undefined;

  //     if (routeWithWaypoint && routeWithWaypoint.params?.newWaypoint) {
  //       const newWaypoint = routeWithWaypoint.params.newWaypoint as Waypoint;
  //       setWaypoints((prevWaypoints) => [...prevWaypoints, newWaypoint]);
  //     }
  //   });

  //   return unsubscribe;
  // }, [navigation]);

  const handleMapPress = (event: MapPressEvent) => {

    const { coordinate } = event.nativeEvent;
    setClickedLocation(coordinate);
    console.log('Clicked location:', coordinate);

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${coordinate.latitude},${coordinate.longitude}&destination=${coordinate.latitude},${coordinate.longitude}&waypoints=${coordinate.latitude},${coordinate.longitude}&key=${process.env.REACT_APP_MAP_API}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const overviewPolyline = data.routes[0].overview_polyline.points;

        const address = data.routes[0].legs.map((leg: RouteLeg) => {
          return leg.end_address;
        });
        if (address.length === 0) {
          address.push('No address found');
        }
        const newWaypoint = {
          id: waypoints.length + 1,
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          address: address[0],
          order: waypoints.length + 1
        };
        dispatch(addWaypoint(newWaypoint));
        const decodedPoints = decodePolyline(overviewPolyline);
        setRouteCoordinates(decodedPoints);
      });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: waypoints[0].latitude,
          longitude: waypoints[0].longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onPress={handleMapPress}
      >
        {Array.isArray(waypoints) && waypoints.length > 0 && waypoints.map((waypoint: Waypoint, index) => (
          <Marker
            key={`Waypoint ${index + 1}`}
            coordinate={waypoint}
            title={waypoint.address}
          />
        ))}

        <Marker coordinate={destination} title="Destination" />

        {Array.isArray(routeCoordinates) && routeCoordinates.length > 0 && (
          <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="blue" />
        )}

      </MapView>

      <Button
        title="Add New Waypoint"
        onPress={() => navigation.navigate('AddWaypointScreen')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MapScreen;
