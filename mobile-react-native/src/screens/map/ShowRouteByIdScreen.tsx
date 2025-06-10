import ContextMenu from 'components/ContextMenu';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Polyline, Marker, LongPressEvent } from 'react-native-maps';
import { Button } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from 'store/hook';
import { addWaypoint, deleteWaypoint, setSelectedWaypointId, updateLocation } from 'store/slices/roadSlice';

import { showNotification } from 'services/notificationService';

import { RouteCoordinate, ShowRouteByIdScreenType, Waypoint } from 'types/map-screen-type';
import { RouteLeg } from 'types/road';

import appConfig from 'constants/appConfig';
import { decodePolyline } from 'utils/decodePolyline';

const routeCache = new Map<string, RouteCoordinate[]>();


const REACT_APP_MAP_API_KEY = appConfig.mapApiKey

const ShowRouteByIdScreen = ({ navigation, route }: ShowRouteByIdScreenType) => {
    const { routeId } = route.params;
        
    const dispatch = useAppDispatch();
    const { wayPoints } = useAppSelector((state) => state.road);
    
    const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
    const [clickedLocation, setClickedLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
    const [marker, setMarker] = useState<Waypoint | undefined>(undefined);
    console.log(wayPoints);
    
    useEffect(() => {
        if (wayPoints.length < 2) return;
    
        const timeout = setTimeout(() => {
            fetchRoute();
        }, 600); 
    
        return () => clearTimeout(timeout);
    }, [wayPoints]);
    

    const fetchRoute = async () => {
        try {
            const waypointsString = wayPoints
            .slice(1, -1)
            .map((point) => `${point.latitude},${point.longitude}`)
            .join('|');
          
          const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${wayPoints[0].latitude},${wayPoints[0].longitude}&destination=${wayPoints.at(-1)?.latitude},${wayPoints.at(-1)?.longitude}&waypoints=optimize:true|${waypointsString}&key=${REACT_APP_MAP_API_KEY}`;
          
            fetch(url)
                .then(async (data) => {
                    const res = await data.json()
                    const overviewPolyline = res.routes[0].overview_polyline.points;
                    const decodedPoints = decodePolyline(overviewPolyline);
                    setRouteCoordinates(decodedPoints);
                });
        } catch (error) {
            showNotification({
                type: 'error',
                header: 'Error',
                message: 'Failed to fetch directions. Please try again later.',
            })
        }
    };

    const handleMapPress = (event: LongPressEvent) => {
        const { coordinate } = event.nativeEvent;

        const pressedMarker = wayPoints.find(
            (waypoint) =>
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

    const addLocation = (coordinate: { latitude: number, longitude: number }) => {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${coordinate.latitude},${coordinate.longitude}&destination=${coordinate.latitude},${coordinate.longitude}&waypoints=${coordinate.latitude},${coordinate.longitude}&key=${REACT_APP_MAP_API_KEY}`;

        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                const overviewPolyline = data.routes[0].overview_polyline.points;

                const address = data.routes[0].legs.map((leg: RouteLeg) => {
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
                    id: wayPoints.length + 1,
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    address: address[0],
                    order: wayPoints.length + 1,
                };
                dispatch(addWaypoint(newWaypoint));
                const decodedPoints = decodePolyline(overviewPolyline);
                setRouteCoordinates(decodedPoints);
            });
    }

    const handleAddWaypoint = () => {
        if (clickedLocation) {
            addLocation(clickedLocation)
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
    const handleMarkerDragEnd = (event: any) => {
        if (isContextMenuVisible) {
            setIsDragging(false);
            return
        }
        const { coordinate } = event.nativeEvent;
        setClickedLocation(coordinate);
        dispatch(updateLocation({
            id: marker!.id,
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
        }));
        setIsDragging(false);
    };


    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: wayPoints[0].latitude,
                    longitude: wayPoints[0].longitude,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                onLongPress={handleMapPress}
                scrollEnabled={!isDragging}
            >
                {Array.isArray(wayPoints) &&
                    wayPoints.length > 0 &&
                    wayPoints.map((waypoint: Waypoint, index) => (
                        <Marker
                            id={waypoint.id.toString()}
                            key={`Waypoint ${index + 1}`}
                            coordinate={waypoint}
                            title={waypoint.address}
                            draggable={isDragging}
                            onDragEnd={handleMarkerDragEnd}
                        >
                        </Marker>
                    ))}

                {Array.isArray(routeCoordinates) && routeCoordinates.length > 0 && (
                    <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="blue" />
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
{/* 
            <Button
                onPress={() => navigation.navigate('ShowRouteByIdScreen', {})}
            >
                Route
            </Button>
            <Button
                onPress={() => navigation.navigate('EditWaypointScreen')}
            >
                Edit Route
            </Button> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
});

export default ShowRouteByIdScreen;