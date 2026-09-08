import {
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
import useInitialRegion from 'hooks/map/useInitialRegion';
import useLiveLocation from 'hooks/map/useLiveLocation';
import { createRouteLineStyles, RouteLineStyle } from 'constants/transportStyles';
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
import { RouteCoordinate, StopWithAddress } from 'types/map-screen-type';
import { addressLocality, addressName } from 'utils/address';
import { withAlpha } from 'utils/color';
import { splitRouteAtLocation } from 'utils/geo';
import { metersToDistance } from 'utils/secondsToHour';
import useMapStyle from 'hooks/map/useMapStyle';

const EMPTY_SELECTION: readonly string[] = [];

const EDGE_PADDING = { top: 90, right: 70, bottom: 260, left: 70 };
const DEFAULT_DELTA = 0.08;
const LOCATE_BUTTON_TOP_OFFSET = 62;
const FOLLOW_BUTTON_TOP_OFFSET = LOCATE_BUTTON_TOP_OFFSET + 52;

const TRAVELLED_OPACITY = 0.6;

const ON_ROUTE_METERS = 200;

const FOLLOW_DELTA = 0.01;
const FOLLOW_ANIMATION_MS = 500;

type MarkerProps = {
  stop: StopWithAddress;
  index: number;
  total: number;
  isDraggable: boolean;
  /** 0 for A, 1 for B, -1 when this stop is not part of the compared pair. */
  selectionIndex: number;
  onDragEnd: MapSectionProps['handleMarkerDragEnd'];
};

const SELECTION_LABELS = ['A', 'B'];

const pinColor = (colors: ThemeColors, index: number, total: number) => {
  if (index === 0) return colors.success;
  if (index === total - 1) return colors.accent;
  return colors.primary;
};

const StopMarker = memo(
  ({
    stop,
    index,
    total,
    isDraggable,
    selectionIndex,
    onDragEnd,
  }: MarkerProps) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const isSelected = selectionIndex >= 0;

    // A marker drawn from child views renders blank if it is told never to
    // redraw before those children have laid out. Track changes until the
    // badge has painted once, then stop — redrawing every frame is what makes
    // a map with custom markers stutter.
    const [isBadgePainted, setIsBadgePainted] = useState(false);

    useEffect(() => {
      if (!isSelected) setIsBadgePainted(false);
    }, [isSelected]);

    const handleDragEnd = useCallback(
      (event: Parameters<MapSectionProps['handleMarkerDragEnd']>[0]) =>
        onDragEnd(event, stop.id),
      [onDragEnd, stop.id],
    );

    const coordinate = useMemo(
      () => ({ latitude: stop.latitude, longitude: stop.longitude }),
      [stop.latitude, stop.longitude],
    );

    const label = isSelected
      ? `${SELECTION_LABELS[selectionIndex]}. `
      : `${index + 1}. `;

    return (
      <Marker
        coordinate={coordinate}
        draggable={isDraggable}
        onDragEnd={handleDragEnd}
        tracksViewChanges={isSelected && !isBadgePainted}
        pinColor={isSelected ? colors.selection : pinColor(colors, index, total)}
        title={`${label}${addressName(stop.address) || 'Stop'}`}
        description={
          isDraggable ? 'Drag to reposition' : addressLocality(stop.address)
        }
        opacity={isDraggable ? 0.85 : 1}
        anchor={isSelected ? { x: 0.5, y: 0.5 } : undefined}
      >
        {isSelected ? (
          <View
            style={styles.selectionPin}
            onLayout={() => setIsBadgePainted(true)}
          >
            <Text style={styles.selectionPinText}>
              {SELECTION_LABELS[selectionIndex]}
            </Text>
          </View>
        ) : null}
      </Marker>
    );
  },
);

StopMarker.displayName = 'StopMarker';

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
        pinColor={colors.place}
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
  stops,
  routeCoordinates,
  draggingStopId,
  summary,
  transportMode,
  handleMarkerDragEnd,
  onMapLongPress,
  onMapPress,
  mapRef,
  foundPlaces,
  onFoundPlacePress,
  selectedStopIds = EMPTY_SELECTION,
}: MapSectionProps) => {
  const { colors } = useTheme();
  const { mapStyle, isDark } = useMapStyle();
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
    const first = stops[0];
    if (!first) return userRegion;
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
  }, [userRegion, stops]);

  useEffect(() => {
    if (!autoFitRoute || hasFittedRef.current || stops.length < 2) return;
    hasFittedRef.current = true;

    const coordinates = stops.map(({ latitude, longitude }) => ({
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
  }, [autoFitRoute, mapRef, stops]);

  useEffect(() => {
    if (isResolving || hasCentredOnUserRef.current) return;
    if (stops.length > 0) return;

    hasCentredOnUserRef.current = true;
    mapRef.current?.animateToRegion(userRegion, 500);
  }, [isResolving, mapRef, userRegion, stops.length]);

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
        customMapStyle={mapStyle}
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

        {stops.map((stop, index) => (
          <StopMarker
            key={stop.id}
            stop={stop}
            index={index}
            total={stops.length}
            isDraggable={draggingStopId === stop.id}
            selectionIndex={selectedStopIds.indexOf(stop.id)}
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
            {stops.length} stop{stops.length === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    selectionPin: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      backgroundColor: colors.selection,
      borderWidth: 3,
      borderColor: colors.textInverse,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.md,
    },
    selectionPinText: {
      ...typography.label,
      color: colors.textInverse,
      fontWeight: '700',
    },
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
