import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, {
  MapPressEvent,
  Marker,
  Polygon,
  Region,
} from 'react-native-maps';

import LocateButton from 'components/map/LocateButton';
import useInitialRegion from 'hooks/map/useInitialRegion';
import useMapStyle from 'hooks/map/useMapStyle';
import {
  areaFill,
  areaStroke,
  AREA_STROKE_WIDTH,
  cityColor,
  widestFirst,
} from 'constants/travelMap';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { MapArea, MarkedArea } from 'types/travel-map';
import { boundsCorners, boundsToPolygon, boundsToRegion } from 'utils/areaBounds';
import { CityGroup } from 'utils/travelCities';

const LOCATE_BUTTON_TOP = 62;

const EDGE_PADDING = { top: 110, right: 60, bottom: 180, left: 60 };

const FRAME_DELAY_MS = 350;

const PREVIEW_DASH = [8, 6];
const PREVIEW_STROKE_WIDTH = 3;

interface Props {
  mapRef: React.RefObject<MapView | null>;
  areas: readonly MarkedArea[];
  cities: readonly CityGroup[];
  preview?: MapArea;
  previewSlot: number | null;
  onPress: (event: MapPressEvent) => void;
  onCityPress: (city: CityGroup) => void;
}

const AreaShape = memo(({ area, color }: { area: MapArea; color: string }) => (
  <Polygon
    coordinates={boundsToPolygon(area.bounds)}
    fillColor={areaFill(color, area.kind)}
    strokeColor={areaStroke(color)}
    strokeWidth={AREA_STROKE_WIDTH}
  />
));

AreaShape.displayName = 'AreaShape';

// The city's name on the map, beside its colour: colour alone never says
// which city a shape belongs to.
const CityLabel = memo(
  ({
    city,
    color,
    onPress,
  }: {
    city: CityGroup;
    color: string;
    onPress: (city: CityGroup) => void;
  }) => {
    const styles = useThemedStyles(createStyles);
    const [isPainted, setIsPainted] = useState(false);

    const coordinate = useMemo(() => {
      const { latitude, longitude } = boundsToRegion(city.bounds);
      return { latitude, longitude };
    }, [city.bounds]);

    const handlePress = useCallback(() => onPress(city), [city, onPress]);

    return (
      <Marker
        coordinate={coordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={!isPainted}
        onPress={handlePress}
        accessibilityLabel={city.name}
      >
        <View style={styles.label} onLayout={() => setIsPainted(true)}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.labelText} numberOfLines={1}>
            {city.name}
          </Text>
        </View>
      </Marker>
    );
  },
);

CityLabel.displayName = 'CityLabel';

const VisitedAreasMapComponent = ({
  mapRef,
  areas,
  cities,
  preview,
  previewSlot,
  onPress,
  onCityPress,
}: Props) => {
  const { colors, scheme } = useTheme();
  const { mapStyle, isDark, mapKey } = useMapStyle();
  const styles = useThemedStyles(createStyles);

  const { region: userRegion, isResolving } = useInitialRegion();

  const lastRegionRef = useRef<Region | null>(null);
  const hasCentredRef = useRef(false);

  const shapes = useMemo(() => widestFirst(areas), [areas]);

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

  const previewColor = cityColor(colors, scheme, previewSlot);

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
          <AreaShape
            key={area.placeId}
            area={area}
            color={cityColor(colors, scheme, area.colorSlot)}
          />
        ))}

        {cities.map((city) => (
          <CityLabel
            key={`${city.key}:${city.name}:${city.colorSlot}`}
            city={city}
            color={cityColor(colors, scheme, city.colorSlot)}
            onPress={onCityPress}
          />
        ))}

        {preview ? (
          <>
            <Polygon
              coordinates={boundsToPolygon(preview.bounds)}
              fillColor='transparent'
              strokeColor={previewColor}
              strokeWidth={PREVIEW_STROKE_WIDTH}
              lineDashPattern={PREVIEW_DASH}
            />
            <Marker
              coordinate={{
                latitude: preview.latitude,
                longitude: preview.longitude,
              }}
              tracksViewChanges={false}
              pinColor={previewColor}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    locateButton: {
      position: 'absolute',
      right: spacing.lg,
    },
    label: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      maxWidth: 160,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
    },
    labelText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
  });

export const VisitedAreasMap = memo(VisitedAreasMapComponent);
export default VisitedAreasMap;
