import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PlacesSearchBar from 'components/map/PlacesSearchBar';
import RouteSearchSheet from 'components/map/RouteSearchSheet';
import ContextMenu from 'components/ui/ContextMenu';
import ScreenState from 'components/ui/ScreenState';
import EditDetailsModal from 'components/road/EditDetailsModal';
import BottomSheetHandle from 'components/ui/BottomSheetHandle';
import { MapSection } from 'components/map/MapSection';
import ImportFromGoogleMapsModal from 'components/map/ImportFromGoogleMapsModal';
import MapStatusPill from 'components/map/MapStatusPill';
import MapToolbar from 'components/map/MapToolbar';
import LocalStopList from './LocalStopList';
import LocalRoadPicker from './LocalRoadPicker';

import useMapScreen from 'hooks/map/useMapScreen';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

const MapScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const {
    mapRef,
    bottomSheetRef,
    isHydrated,
    isSavingPin,
    isLoggedIn,
    activeRoad,
    roads,
    stops,
    routeLine,
    routeSearch,
    transportMode,
    setTransportMode,
    draggingStopId,
    contextMenuProps,
    onPlaceSelected,
    focusOnPlace,
    handleMarkerDragEnd,
    handleMapLongPress,
    handleMapPress,
    handleReorder,
    handleDeleteStopById,
    handleToggleFavoriteStop,
    stopPair,
    snapPoints,
    summary,
    sheetGesturesEnabled,
    setIsReordering,
    isEditingDetails,
    openDetailsEditor,
    closeDetailsEditor,
    handleSaveDetails,
    isSearchingRoute,
    openRouteSearch,
    closeRouteSearch,
    handleShowOnMap,
    handleAddStop,
    isImporting,
    openImport,
    closeImport,
    isPickingRoad,
    handleSwitchRoad,
    handlePickRoad,
    closePicker,
    handleNewRoad,
    handleDeleteRoad,
  } = useMapScreen();

  if (!isHydrated) {
    return <ScreenState variant='loading' title='Opening the map…' />;
  }

  return (
    <>
      <View style={styles.container}>
        <MapSection
          mapRef={mapRef}
          stops={stops}
          draggingStopId={draggingStopId}
          routeCoordinates={routeLine.coordinates}
          summary={summary}
          transportMode={transportMode}
          handleMarkerDragEnd={handleMarkerDragEnd}
          onMapLongPress={handleMapLongPress}
          onMapPress={handleMapPress}
          foundPlaces={routeSearch.places}
          onFoundPlacePress={focusOnPlace}
          selectedStopIds={stopPair.selected}
        />

        <View style={[styles.searchSlot, { top: insets.top }]}>
          <PlacesSearchBar onPlaceSelected={onPlaceSelected} />
        </View>

        <MapToolbar
          top={insets.top + 64}
          title={activeRoad?.title ?? 'New route'}
          canSwitch={roads.length > 1}
          hasActiveRoad={activeRoad !== undefined}
          onSwitch={handleSwitchRoad}
          onEditDetails={openDetailsEditor}
          onNewRoad={handleNewRoad}
          onDeleteRoad={handleDeleteRoad}
          onImportFromGoogleMaps={openImport}
        />

        {routeSearch.isRoutable ? (
          <Pressable
            style={[styles.onTheWay, { top: insets.top + 112 }]}
            onPress={openRouteSearch}
            accessibilityRole='button'
            accessibilityLabel='Search for places along this route'
          >
            <Ionicons
              name='restaurant-outline'
              size={15}
              color={colors.primary}
            />
            <Text style={styles.onTheWayText}>
              {routeSearch.places.length > 0
                ? `${routeSearch.places.length} on the way`
                : 'On the way'}
            </Text>
          </Pressable>
        ) : null}

        {isSavingPin ? (
          <MapStatusPill top={insets.top + 158} label='Looking up that place…' />
        ) : null}

        {!isLoggedIn && stops.length > 0 ? (
          <MapStatusPill
            top={insets.top + 158}
            icon='phone-portrait-outline'
            label='Saved on this device'
          />
        ) : null}

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
        <LocalStopList
          stops={stops}
          transportMode={transportMode}
          selectedPair={stopPair.selected}
          onToggleSelection={stopPair.toggle}
          onForgetSelection={stopPair.forget}
          onTransportModeChange={setTransportMode}
          onDeleteStop={handleDeleteStopById}
          onToggleFavoriteStop={handleToggleFavoriteStop}
          onReorder={handleReorder}
          onReorderingChange={setIsReordering}
        />
      </BottomSheet>

      <EditDetailsModal
        visible={isEditingDetails}
        heading='Route details'
        hint='Saved on this device until you sign in and upload it.'
        initialTitle={activeRoad?.title}
        initialDescription={activeRoad?.description}
        titleLabel='Route name'
        onSave={handleSaveDetails}
        onCancel={closeDetailsEditor}
      />

      <LocalRoadPicker
        visible={isPickingRoad}
        roads={roads}
        activeRoadId={activeRoad?.id}
        onSelect={handlePickRoad}
        onClose={closePicker}
      />

      <ImportFromGoogleMapsModal visible={isImporting} onClose={closeImport} />

      <RouteSearchSheet
        visible={isSearchingRoute}
        search={routeSearch}
        onClose={closeRouteSearch}
        onShowOnMap={handleShowOnMap}
        onAddStop={handleAddStop}
      />
    </>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchSlot: {
      position: 'absolute',
      left: 0,
      right: 0,
    },
    onTheWay: {
      position: 'absolute',
      left: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    onTheWayText: {
      ...typography.label,
      color: colors.text,
    },
    sheetBackground: { backgroundColor: colors.surface },
  });

export default MapScreen;
