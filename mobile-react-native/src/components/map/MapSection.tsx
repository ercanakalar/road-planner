import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import LocateButton from 'components/map/LocateButton';
import { RoutePlace } from 'services/mapsService';
import { showNotification } from 'services/notificationService';
import { useAppSelector } from 'store/hook';
import useInitialRegion from 'hooks/useInitialRegion';
import useLiveLocation from 'hooks/useLiveLocation';
import { createRouteLineStyles, RouteLineStyle } from 'constants/transportStyles';
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
import { RouteCoordinate, WaypointWithAddress } from 'types/map-screen-type';
import { withAlpha } from 'utils/color';
import { splitRouteAtLocation } from 'utils/geo';
import { metersToDistance } from 'utils/secondsToHour';

const EDGE_PADDING = { top: 90, right: 70, bottom: 260, left: 70 };
const DEFAULT_DELTA = 0.08;
const LOCATE_BUTTON_TOP_OFFSET = 62;
const FOLLOW_BUTTON_TOP_OFFSET = LOCATE_BUTTON_TOP_OFFSET + 52;

const TRAVELLED_OPACITY = 0.6;

const ON_ROUTE_METERS = 200;

const FOLLOW_DELTA = 0.01;
const FOLLOW_ANIMATION_MS = 500;

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

const FoundPlaceMarker = memo(
  ({
    place,
    onPress,
  }: {
    place: RoutePlace;
    onPress?: (place: RoutePlace) => void;
  }) => {
    const { colors } = useTheme();

    const handlePress = useCallback(() => onPress?.(place), [onPress, place]);

    const coordinate = useMemo(
      () => ({ latitude: place.latitude, longitude: place.longitude }),
      [place.latitude, place.longitude],
    );

    return (
      <Marker
        coordinate={coordinate}
        onPress={handlePress}
        tracksViewChanges={false}
        pinColor={colors.warning}
        title={place.name}
        description={`${metersToDistance(place.distanceFromRouteMeters)} off route`}
      />
    );
  },
);

FoundPlaceMarker.displayName = 'FoundPlaceMarker';

const RouteLine = memo(
  ({
    coordinates,
    lineStyle,
    dimmed = false,
  }: {
    coordinates: RouteCoordinate[];
    lineStyle: RouteLineStyle;
    dimmed?: boolean;
  }) => {
    if (coordinates.length < 2) return null;

    const fade = (color: string) =>
      dimmed ? withAlpha(color, TRAVELLED_OPACITY) : color;

    return (
      <>
        <Polyline
          coordinates={coordinates}
          strokeColor={fade(lineStyle.casing)}
          strokeWidth={lineStyle.width + 4}
          lineCap='round'
          lineJoin='round'
        />
        <Polyline
          coordinates={coordinates}
          strokeColor={fade(lineStyle.color)}
          strokeWidth={lineStyle.width}
          lineDashPattern={lineStyle.dashPattern}
          lineCap='round'
          lineJoin='round'
        />
      </>
    );
  },
);

RouteLine.displayName = 'RouteLine';

const FOLLOW_UNAVAILABLE_NOTICE = {
  denied: {
    header: 'Location permission needed',
    message: 'Allow location access to follow your progress along the route.',
  },
  unavailable: {
    header: 'Location unavailable',
    message: 'Your position could not be read, so following was switched off.',
  },
};

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
  foundPlaces,
  onFoundPlacePress,
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

  const hasRoute = routeCoordinates.length > 1;

  const [isFollowing, setIsFollowing] = useState(false);
  const { location: liveLocation, status: followStatus } = useLiveLocation(
    isFollowing && hasRoute,
  );

  const stopFollowing = useCallback(() => setIsFollowing(false), []);
  const toggleFollowing = useCallback(
    () => setIsFollowing((following) => !following),
    [],
  );

  const progress = useMemo(() => {
    if (!liveLocation) return null;

    const split = splitRouteAtLocation(routeCoordinates, liveLocation);

    return split && split.distanceFromRouteMeters <= ON_ROUTE_METERS
      ? split
      : null;
  }, [liveLocation, routeCoordinates]);

  const hasZoomedToFollowRef = useRef(false);

  useEffect(() => {
    if (!isFollowing) hasZoomedToFollowRef.current = false;
  }, [isFollowing]);

  useEffect(() => {
    if (!isFollowing || !liveLocation) return;

    if (hasZoomedToFollowRef.current) {
      mapRef.current?.animateCamera(
        { center: liveLocation },
        { duration: FOLLOW_ANIMATION_MS },
      );
      return;
    }

    hasZoomedToFollowRef.current = true;
    mapRef.current?.animateToRegion(
      {
        ...liveLocation,
        latitudeDelta: FOLLOW_DELTA,
        longitudeDelta: FOLLOW_DELTA,
      },
      FOLLOW_ANIMATION_MS,
    );
  }, [isFollowing, liveLocation, mapRef]);

  useEffect(() => {
    if (followStatus !== 'denied' && followStatus !== 'unavailable') return;

    setIsFollowing(false);
    showNotification({
      type: 'info',
      ...FOLLOW_UNAVAILABLE_NOTICE[followStatus],
    });
  }, [followStatus]);

  useEffect(() => {
    if (!hasRoute) setIsFollowing(false);
  }, [hasRoute]);

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
        onPanDrag={isFollowing ? stopFollowing : undefined}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        initialRegion={initialRegion}
        minZoomLevel={3}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
      >
        {progress ? (
          <>
            <RouteLine
              coordinates={progress.travelled}
              lineStyle={lineStyle}
              dimmed
            />
            <RouteLine
              coordinates={progress.remaining}
              lineStyle={lineStyle}
            />
          </>
        ) : (
          <RouteLine coordinates={routeCoordinates} lineStyle={lineStyle} />
        )}

        {foundPlaces?.map((place) => (
          <FoundPlaceMarker
            key={place.placeId}
            place={place}
            onPress={onFoundPlacePress}
          />
        ))}

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

      {hasRoute ? (
        <Pressable
          onPress={toggleFollowing}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={
            isFollowing
              ? 'Stop following my position along the route'
              : 'Follow my position along the route'
          }
          accessibilityState={{ selected: isFollowing }}
          style={({ pressed }) => [
            styles.followButton,
            { top: insets.top + FOLLOW_BUTTON_TOP_OFFSET },
            isFollowing && styles.followButtonActive,
            pressed && styles.followButtonPressed,
          ]}
        >
          <Ionicons
            name={isFollowing ? 'navigate' : 'navigate-outline'}
            size={20}
            color={isFollowing ? colors.textInverse : colors.primary}
          />
        </Pressable>
      ) : null}

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
    followButton: {
      position: 'absolute',
      right: spacing.lg,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      ...shadows.md,
    },
    followButtonActive: {
      backgroundColor: colors.primary,
    },
    followButtonPressed: { opacity: 0.85 },
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
