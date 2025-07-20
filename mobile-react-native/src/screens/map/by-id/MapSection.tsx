import React from 'react';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { StyleSheet, Dimensions } from 'react-native';
import { LongPressEvent } from 'react-native-maps';
import { WaypointWithAddress, RouteCoordinate } from 'types/map-screen-type';
type Props = {
    waypoints: WaypointWithAddress[];
    isDragging: boolean;
    selectedMarkerId?: string;
    routeCoordinates: RouteCoordinate[];
    handleMarkerDragEnd: (event: any, waypointId: string) => void;
    onMapPress: (event: LongPressEvent) => void;
};

export const MapSection = ({
    waypoints,
    isDragging,
    selectedMarkerId,
    routeCoordinates,
    handleMarkerDragEnd,
    onMapPress
}: Props) => {
    return (
        <MapView
            style={styles.map}
            initialRegion={{
                latitude: waypoints[0].latitude,
                longitude: waypoints[0].longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            }}
            scrollEnabled={!isDragging}
            onLongPress={(event) => onMapPress(event)}
        >
            {waypoints.map((waypoint) => (
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
                    coordinates={routeCoordinates.map((p) => ({
                        latitude: p.latitude,
                        longitude: p.longitude,
                    }))}
                    strokeWidth={4}
                    strokeColor="blue"
                />
            )}
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.45,
    },
});
