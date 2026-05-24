import React from 'react';
import { View } from 'react-native';
import MapView, { LongPressEvent, Marker, Polyline } from 'react-native-maps';
import { WaypointWithAddress } from 'types/map-screen-type';

interface MapSectionProps {
  waypoints: WaypointWithAddress[];
  routeCoordinates: { latitude: number; longitude: number }[];
  selectedMarkerId?: string;
  isDragging?: boolean;
  handleMarkerDragEnd?: (event: any, waypointId: string) => void;
  onMapLongPress: (event: LongPressEvent) => void;
  ref: any;
}

export const MapSection = ({
  waypoints,
  routeCoordinates,
  selectedMarkerId,
  isDragging,
  handleMarkerDragEnd,
  onMapLongPress,
  ref,
}: MapSectionProps) => {
  return (
    <View style={{ flex: 1 }} pointerEvents='box-none'>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        onLongPress={onMapLongPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: waypoints[0]?.latitude || 0,
          longitude: waypoints[0]?.longitude || 0,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {waypoints.map((wp) => (
          <Marker
            key={wp.id}
            coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
            draggable={isDragging && selectedMarkerId === wp.id}
            onDragEnd={(e) => handleMarkerDragEnd?.(e, wp.id)}
          />
        ))}
        <Polyline
          coordinates={routeCoordinates}
          strokeColor='blue'
          strokeWidth={3}
        />
      </MapView>
    </View>
  );
};
