import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';

import { useAppSelector } from 'store/hook';
import { colors, radius, shadows, spacing, typography } from 'theme';
import { MapSectionProps } from 'types/screens/mapScreenType';
import { WaypointWithAddress } from 'types/map-screen-type';

const EDGE_PADDING = { top: 90, right: 70, bottom: 260, left: 70 };
const DEFAULT_DELTA = 0.08;

type MarkerProps = {
  waypoint: WaypointWithAddress;
  index: number;
  total: number;
  isDraggable: boolean;
  onDragEnd: MapSectionProps['handleMarkerDragEnd'];
};

const pinColor = (index: number, total: number) => {
  if (index === 0) return colors.success;
  if (index === total - 1) return colors.accent;
  return colors.primary;
};


const WaypointMarker = memo(
  ({ waypoint, index, total, isDraggable, onDragEnd }: MarkerProps) => {
    const handleDragEnd = useCallback(
      (event: Parameters<MapSectionProps['handleMarkerDragEnd']>[0]) =>
        onDragEnd(event, waypoint.id),
      [onDragEnd, waypoint.id],
    );

    const coordinate = useMemo(
      () => ({ latitude: waypoint.latitude, longitude: waypoint.longitude }),
      [waypoint.latitude, waypoint.longitude],
    );

    return (
      <Marker
        coordinate={coordinate}
        draggable={isDraggable}
        onDragEnd={handleDragEnd}
        tracksViewChanges={false}
        pinColor={pinColor(index, total)}
        title={`${index + 1}. ${waypoint.address?.address ?? 'Waypoint'}`}
        description={
          isDraggable ? 'Drag to reposition' : waypoint.address?.district ?? ''
        }
        opacity={isDraggable ? 0.85 : 1}
      />
    );
  },
);

WaypointMarker.displayName = 'WaypointMarker';

const MapSectionComponent = ({
  waypoints,
  routeCoordinates,
  draggingWaypointId,
  summary,
  handleMarkerDragEnd,
  onMapLongPress,
  onMapPress,
  mapRef,
}: MapSectionProps) => {
  const hasFittedRef = useRef(false);
  const autoFitRoute = useAppSelector((state) => state.settings.autoFitRoute);

  const initialRegion = useMemo<Region>(() => {
    const first = waypoints[0];
    return {
      latitude: first?.latitude ?? 0,
      longitude: first?.longitude ?? 0,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }, [waypoints]);


  useEffect(() => {
    if (!autoFitRoute || hasFittedRef.current || waypoints.length < 2) return;
    hasFittedRef.current = true;

    const coordinates = waypoints.map(({ latitude, longitude }) => ({
      latitude,
      longitude,
    }));

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: EDGE_PADDING,
        animated: true,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [autoFitRoute, mapRef, waypoints]);

  return (
    <View style={styles.container} pointerEvents='box-none'>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        onLongPress={onMapLongPress}
        onPress={onMapPress}
        showsUserLocation
        showsMyLocationButton
        showsCompass={false}
        toolbarEnabled={false}
        initialRegion={initialRegion}
        minZoomLevel={3}
      >
        {routeCoordinates.length > 1 ? (
          <>
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.routeCasing}
              strokeWidth={9}
              lineCap='round'
              lineJoin='round'
            />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.route}
              strokeWidth={4}
              lineCap='round'
              lineJoin='round'
            />
          </>
        ) : null}

        {waypoints.map((waypoint, index) => (
          <WaypointMarker
            key={waypoint.id}
            waypoint={waypoint}
            index={index}
            total={waypoints.length}
            isDraggable={draggingWaypointId === waypoint.id}
            onDragEnd={handleMarkerDragEnd}
          />
        ))}
      </MapView>

      {summary ? (
        <View style={styles.summary} pointerEvents='none'>
          <Text style={styles.summaryValue}>{summary.duration}</Text>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryLabel}>{summary.distance}</Text>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryLabel}>
            {waypoints.length} stop{waypoints.length === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadows.md,
  },
  summaryValue: {
    ...typography.label,
    color: colors.text,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
});

export const MapSection = memo(MapSectionComponent);
export default MapSection;
