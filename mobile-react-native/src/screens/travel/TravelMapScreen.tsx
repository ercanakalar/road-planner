import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import MapStatusPill from 'components/map/MapStatusPill';
import PlacesSearchBar from 'components/map/PlacesSearchBar';
import AreaPickerCard from 'components/travel/AreaPickerCard';
import MarkedAreasPanel from 'components/travel/MarkedAreasPanel';
import VisitedAreasMap from 'components/travel/VisitedAreasMap';
import ScreenState from 'components/ui/ScreenState';
import useTravelMap from 'hooks/travel/useTravelMap';
import { spacing, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

/** Just below the floating search bar, which starts 8 in and is 52 tall. */
const STATUS_PILL_TOP = 68;

/**
 * The travel map: every country, city, village or single place somebody has
 * been, shaded onto one map.
 *
 * Marking is deliberately two taps — one to pick the place out of the several
 * that cover any point, one to colour it in — because "everywhere I have been"
 * is not a list anybody wants to have added a stray tap to.
 */
const TravelMapScreen = () => {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
    mapRef,
    areas,
    isHydrated,
    candidates,
    candidateIndex,
    selected,
    isSelectedMarked,
    isResolving,
    handleMapPress,
    handlePlaceSelected,
    chooseCandidate,
    markSelected,
    unmarkSelected,
    unmark,
    focusOn,
    dismiss,
    clearAll,
  } = useTravelMap();

  const [isListExpanded, setIsListExpanded] = useState(false);

  const toggleList = useCallback(
    () => setIsListExpanded((expanded) => !expanded),
    [],
  );

  // The list and the picker both live along the bottom edge, and two open at
  // once leaves the map a strip. Picking a place folds the list away.
  useEffect(() => {
    if (selected) setIsListExpanded(false);
  }, [selected]);

  if (!isHydrated) {
    return <ScreenState variant='loading' title={t('travelMap.opening')} />;
  }

  return (
    <View style={styles.container}>
      <VisitedAreasMap
        mapRef={mapRef}
        areas={areas}
        preview={selected}
        onPress={handleMapPress}
      />

      <View style={styles.searchSlot}>
        <PlacesSearchBar
          onPlaceSelected={handlePlaceSelected}
          placeholder={t('travelMap.searchPlace')}
        />
      </View>

      {isResolving ? (
        <MapStatusPill
          top={STATUS_PILL_TOP}
          label={t('travelMap.lookingUpPlace')}
        />
      ) : null}

      <View
        style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}
        pointerEvents='box-none'
      >
        {selected ? (
          <AreaPickerCard
            candidates={candidates}
            selectedIndex={candidateIndex}
            isMarked={isSelectedMarked}
            onChoose={chooseCandidate}
            onMark={markSelected}
            onRemove={unmarkSelected}
            onDismiss={dismiss}
          />
        ) : null}

        <MarkedAreasPanel
          areas={areas}
          isExpanded={isListExpanded}
          onToggle={toggleList}
          onFocus={focusOn}
          onRemove={unmark}
          onClear={clearAll}
        />
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchSlot: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
    },
    bottom: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: 0,
      gap: spacing.sm,
    },
  });

export default TravelMapScreen;
