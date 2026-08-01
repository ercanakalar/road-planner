import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import PlacesSearchBar from 'components/PlacesSearchBar';
import ContextMenu from 'components/ContextMenu';
import ScreenState from 'components/ScreenState';
import BottomSheetHandle from 'components/BottomSheetHandle';
import EnhancedWaypointList from 'screens/map/roads/EnhancedWaypointList';
import { MapSection } from './MapSection';

import useMapLogic from 'hooks/useMapLogic';
import { colors } from 'theme';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';

const ShowRouteByIdScreen = () => {
  const {
    roadId,
    mapRef,
    bottomSheetRef,
    isLoading,
    waypoints,
    routeLine,
    transportMode,
    setTransportMode,
    draggingWaypointId,
    contextMenuProps,
    onPlaceSelected,
    handleMarkerDragEnd,
    handleMapLongPress,
    handleMapPress,
  } = useMapLogic();

  const { height: windowHeight } = useWindowDimensions();
  const [isReordering, setIsReordering] = useState(false);

  const snapPoints = useMemo(() => {
    const points = [0.22, 0.45, 0.75].map((ratio) =>
      Math.round(windowHeight * ratio),
    );
    return Array.from(new Set(points)).sort((a, b) => a - b);
  }, [windowHeight]);

  const summary = useMemo(() => {
    if (routeLine.durationSeconds === undefined) return undefined;
    return {
      duration: secondsToHour(routeLine.durationSeconds),
      distance: metersToDistance(routeLine.distanceMeters),
    };
  }, [routeLine.distanceMeters, routeLine.durationSeconds]);

  const handleReorderingChange = useCallback(
    (reordering: boolean) => setIsReordering(reordering),
    [],
  );

  if (isLoading && waypoints.length === 0) {
    return <ScreenState variant='loading' title='Loading route…' />;
  }

  const sheetGesturesEnabled = !draggingWaypointId && !isReordering;

  return (
    <>
      <View style={styles.container}>
        <MapSection
          mapRef={mapRef}
          waypoints={waypoints}
          draggingWaypointId={draggingWaypointId}
          routeCoordinates={routeLine.coordinates}
          summary={summary}
          handleMarkerDragEnd={handleMarkerDragEnd}
          onMapLongPress={handleMapLongPress}
          onMapPress={handleMapPress}
        />

        <PlacesSearchBar onPlaceSelected={onPlaceSelected} />

        <ContextMenu {...contextMenuProps} />
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose={false}
        enableContentPanningGesture={sheetGesturesEnabled}
        enableHandlePanningGesture={sheetGesturesEnabled}
        enableDynamicSizing={false}
        handleComponent={BottomSheetHandle}
        backgroundStyle={styles.sheetBackground}
      >
        <EnhancedWaypointList
          roadId={roadId}
          transportMode={transportMode}
          onTransportModeChange={setTransportMode}
          onReorderingChange={handleReorderingChange}
        />
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sheetBackground: {
    backgroundColor: colors.surface,
  },
});

export default memo(ShowRouteByIdScreen);
