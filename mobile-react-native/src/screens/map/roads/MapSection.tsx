import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LocateButton from 'components/LocateButton';
import { useAppSelector } from 'store/hook';
import useInitialRegion from 'hooks/useInitialRegion';
import { createRouteLineStyles } from 'constants/transportStyles';
import { darkMapStyle, lightMapStyle } from 'constants/mapStyles';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { MapSectionProps } from 'types/screens/mapScreenType';
import { WaypointWithAddress } from 'types/map-screen-type';

const EDGE_PADDING = { top: 90, right: 70, bottom: 260, left: 70 };
const DEFAULT_DELTA = 0.08;
const LOCATE_BUTTON_TOP_OFFSET = 62;

type MarkerProps = {
  waypoint: WaypointWithAddress;
  index: number;
  total: number;
  isDraggable: boolean;
  onDragEnd: MapSectionProps['handleMarkerDragEnd'];
};

const pinColor = (colors: ThemeColors, index: number, total: number) => {
  if (index === 0) return colors.success;
  if (index === total - 1) return colors.accent;
  return colors.primary;
};

const WaypointMarker = memo(
  ({ waypoint, index, total, isDraggable, onDragEnd }: MarkerProps) => {
    const { colors } = useTheme();

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
        pinColor={pinColor(colors, index, total)}
        title={`${index + 1}. ${waypoint.address?.address ?? 'Waypoint'}`}
        description={
          isDraggable
            ? 'Drag to reposition'
            : (waypoint.address?.district ?? '')
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
  transportMode,
  handleMarkerDragEnd,
  onMapLongPress,
  onMapPress,
  mapRef,
}: MapSectionProps) => {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const hasFittedRef = useRef(false);
  const hasCentredOnUserRef = useRef(false);
  const insets = useSafeAreaInsets();
  const lineStyle = useMemo(
    () => createRouteLineStyles(colors)[transportMode],
    [colors, transportMode],
  );
  const autoFitRoute = useAppSelector((state) => state.settings.autoFitRoute);
  const { region: userRegion, isResolving } = useInitialRegion();

  const initialRegion = useMemo<Region>(() => {
    const first = waypoints[0];
    if (!first) return userRegion;
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }, [userRegion, waypoints]);

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

  useEffect(() => {
    if (isResolving || hasCentredOnUserRef.current) return;
    if (waypoints.length > 0) return;

    hasCentredOnUserRef.current = true;
    mapRef.current?.animateToRegion(userRegion, 500);
  }, [isResolving, mapRef, userRegion, waypoints.length]);

  return (
    <View style={styles.container} pointerEvents='box-none'>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        onLongPress={onMapLongPress}
        onPress={onMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        initialRegion={initialRegion}
        minZoomLevel={3}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
      >
        {routeCoordinates.length > 1 ? (
          <>
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={lineStyle.casing}
              strokeWidth={lineStyle.width + 4}
              lineCap='round'
              lineJoin='round'
            />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={lineStyle.color}
              strokeWidth={lineStyle.width}
              lineDashPattern={lineStyle.dashPattern}
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

      <LocateButton
        mapRef={mapRef}
        zoomDelta={0.01}
        style={[
          styles.locateButton,
          { top: insets.top + LOCATE_BUTTON_TOP_OFFSET },
        ]}
      />

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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    locateButton: {
      position: 'absolute',
      right: spacing.lg,
    },
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
