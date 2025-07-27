import React  from 'react';
import { SafeAreaView, ActivityIndicator, Text } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import PlacesSearchBar from 'components/PlacesSearchBar';
import ContextMenu from 'components/ContextMenu';
import EnhancedWaypointList from 'components/EnhancedWaypointList';
import { MapSection } from './MapSection';
import useMapLogic from 'hooks/useMapLogic';

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

  if (isLoading || !data?.wayPoints?.length) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text>Loading route...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1 }}>
        <PlacesSearchBar onPlaceSelected={onPlaceSelected} />
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
      </SafeAreaView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['20%', '40%', '60%', '80%']}
        index={0}
        enablePanDownToClose={false}
        enableContentPanningGesture={!isDragging}
        enableHandlePanningGesture={!isDragging}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <EnhancedWaypointList routeId={routeId} />
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
};

export default ShowRouteByIdScreen;
