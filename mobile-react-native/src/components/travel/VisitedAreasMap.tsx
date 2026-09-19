import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { MapPressEvent, Marker, Polygon, Region } from 'react-native-maps';

import LocateButton from 'components/map/LocateButton';
import useInitialRegion from 'hooks/map/useInitialRegion';
import useMapStyle from 'hooks/map/useMapStyle';
import {
  areaColor,
  areaFill,
  areaStroke,
  AREA_STROKE_WIDTH,
  widestFirst,
} from 'constants/travelMap';
import { spacing, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { MapArea, MarkedArea } from 'types/travel-map';
import { boundsCorners, boundsToPolygon } from 'utils/areaBounds';

const LOCATE_BUTTON_TOP = 62;

/** Room for the search bar above and the marked-places panel below. */
const EDGE_PADDING = { top: 110, right: 60, bottom: 180, left: 60 };

/** Long enough for the map to have laid out before the camera is moved. */
const FRAME_DELAY_MS = 350;

/** The dashes that say a place is being considered rather than kept. */
const PREVIEW_DASH = [8, 6];
const PREVIEW_STROKE_WIDTH = 3;

interface Props {
  mapRef: React.RefObject<MapView | null>;
  areas: readonly MarkedArea[];
  /** The place a tap or a search turned up, not marked yet. */
  preview?: MapArea;
  onPress: (event: MapPressEvent) => void;
}

const AreaShape = memo(
  ({ area, colors }: { area: MapArea; colors: ThemeColors }) => (
    <Polygon
      coordinates={boundsToPolygon(area.bounds)}
      fillColor={areaFill(colors, area.kind)}
      strokeColor={areaStroke(colors, area.kind)}
      strokeWidth={AREA_STROKE_WIDTH}
    />
  ),
);

AreaShape.displayName = 'AreaShape';

/**
 * The map with the places somebody has been coloured in.
 *
 * The shading is translucent on purpose: the roads and names underneath have
 * to stay readable, and two places that overlap — a city inside its country —
 * deepen where they meet rather than one hiding the other.
 */
const VisitedAreasMapComponent = ({ mapRef, areas, preview, onPress }: Props) => {
  const { colors } = useTheme();
  const { mapStyle, isDark, mapKey } = useMapStyle();
  const styles = useThemedStyles(createStyles);

  const { region: userRegion, isResolving } = useInitialRegion();

  // Rebuilding the map on a theme change hands it nothing but `initialRegion`
  // (see useMapStyle), so where it was last looking is remembered and fed back
  // — otherwise changing theme throws the camera back to where it started.
  const lastRegionRef = useRef<Region | null>(null);
  const hasCentredRef = useRef(false);

  const shapes = useMemo(() => widestFirst(areas), [areas]);

  // Opening the screen shows the map somebody has already coloured in, framed
  // so all of it fits. Only an empty map falls through to their own location,
  // which is the one place a first mark is likely to be.
  useEffect(() => {
    if (hasCentredRef.current || areas.length === 0) return;

    hasCentredRef.current = true;
    const corners = areas.flatMap((area) => boundsCorners(area.bounds));

    const timer = setTimeout(
      () =>
        mapRef.current?.fitToCoordinates(corners, {
          edgePadding: EDGE_PADDING,
          animated: true,
        }),
      FRAME_DELAY_MS,
    );

    return () => clearTimeout(timer);
  }, [areas, mapRef]);

  useEffect(() => {
    if (isResolving || hasCentredRef.current || areas.length > 0) return;

    hasCentredRef.current = true;
    mapRef.current?.animateToRegion(userRegion, 500);
  }, [areas.length, isResolving, mapRef, userRegion]);

  return (
    <View style={styles.container} pointerEvents='box-none'>
      <MapView
        key={mapKey}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        onRegionChangeComplete={(region) => {
          lastRegionRef.current = region;
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        initialRegion={lastRegionRef.current ?? userRegion}
        minZoomLevel={2}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        customMapStyle={mapStyle}
      >
        {shapes.map((area) => (
          <AreaShape key={area.placeId} area={area} colors={colors} />
        ))}

        {preview ? (
          <>
            <Polygon
              coordinates={boundsToPolygon(preview.bounds)}
              fillColor='transparent'
              strokeColor={areaColor(colors, preview.kind)}
              strokeWidth={PREVIEW_STROKE_WIDTH}
              lineDashPattern={PREVIEW_DASH}
            />
            <Marker
              coordinate={{
                latitude: preview.latitude,
                longitude: preview.longitude,
              }}
              tracksViewChanges={false}
              pinColor={areaColor(colors, preview.kind)}
              title={preview.name}
              description={preview.address}
            />
          </>
        ) : null}
      </MapView>

      <LocateButton
        mapRef={mapRef}
        zoomDelta={0.5}
        style={[styles.locateButton, { top: LOCATE_BUTTON_TOP }]}
      />
    </View>
  );
};

const createStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    locateButton: {
      position: 'absolute',
      right: spacing.lg,
    },
  });

export const VisitedAreasMap = memo(VisitedAreasMapComponent);
export default VisitedAreasMap;
