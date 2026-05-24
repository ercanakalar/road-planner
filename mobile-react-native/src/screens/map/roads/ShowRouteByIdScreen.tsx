import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  ActivityIndicator,
  Text,
  View,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import PlacesSearchBar from 'components/PlacesSearchBar';
import ContextMenu from 'components/ContextMenu';
import EnhancedWaypointList from 'screens/map/roads/EnhancedWaypointList';
import { MapSection } from './MapSection';
import useMapLogic from 'hooks/useMapLogic';
import BottomSheetHandle from 'components/BottomSheetHandle';

const ShowRouteByIdScreen = () => {
  const {
    routeId,
    mapRef,
    bottomSheetRef,
    isLoading,
    data,
    isDragging,
    contextMenuProps,
    markerLogic,
    onPlaceSelected,
    handleMarkerDragEnd,
    handleMapLongPress,
  } = useMapLogic();

  const { height: windowHeight } = useWindowDimensions();
  const [searchBarBottom, setSearchBarBottom] = useState(0);

  const handleSearchLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setSearchBarBottom(y + height);
  }, []);

  const snapPoints = useMemo(() => {
    const min = Math.round(windowHeight * 0.2);
    const mid = Math.round(windowHeight * 0.4);
    const large = Math.round(windowHeight * 0.6);

    const maxByScreen = Math.round(windowHeight * 0.8);
    const maxBySearch =
      searchBarBottom > 0
        ? Math.round(windowHeight - searchBarBottom)
        : maxByScreen;

    const max = Math.max(min, Math.min(maxByScreen, maxBySearch));

    return [min, mid, large, max]
      .filter((point, index, arr) => point > 0 && arr.indexOf(point) === index)
      .sort((a, b) => a - b);
  }, [windowHeight, searchBarBottom]);

  if (isLoading || !data?.wayPoints?.length) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text>Loading route...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ flex: 1 }}>
        <View onLayout={handleSearchLayout}>
          <PlacesSearchBar onPlaceSelected={onPlaceSelected} />
        </View>

        <MapSection
          ref={mapRef}
          waypoints={data.wayPoints}
          isDragging={isDragging}
          selectedMarkerId={markerLogic.selectedMarkerId}
          routeCoordinates={markerLogic.routeCoordinates}
          handleMarkerDragEnd={handleMarkerDragEnd}
          onMapLongPress={handleMapLongPress}
        />

        <ContextMenu {...contextMenuProps} />
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose={false}
        enableContentPanningGesture={!isDragging}
        enableHandlePanningGesture={!isDragging}
        enableDynamicSizing={false}
        handleComponent={BottomSheetHandle}
      >
        <EnhancedWaypointList routeId={routeId} />
      </BottomSheet>
    </>
  );
};

export default memo(ShowRouteByIdScreen);
