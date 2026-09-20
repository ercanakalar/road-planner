import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type MapView from 'react-native-maps';
import type { MapPressEvent } from 'react-native-maps';

import useConfirm from 'hooks/feedback/useConfirm';
import { fetchAreasAt } from 'services/mapsService';
import { showNotification } from 'services/notificationService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import {
  areaMarked,
  areaUnmarked,
  travelMapCleared,
} from 'store/slices/travelMapSlice';
import { MapArea } from 'types/travel-map';
import { boundsToRegion } from 'utils/areaBounds';

const FOCUS_ANIMATION_MS = 600;

export function useTravelMap() {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  const areas = useAppSelector((state) => state.travelMap.areas);
  const isHydrated = useAppSelector((state) => state.travelMap.isHydrated);

  const [candidates, setCandidates] = useState<MapArea[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);

  const lookupRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      lookupRef.current?.abort();
    },
    [],
  );

  const markedIds = useMemo(
    () => new Set(areas.map((area) => area.placeId)),
    [areas],
  );

  const selected = candidates[candidateIndex];

  const focusOn = useCallback((area: MapArea) => {
    mapRef.current?.animateToRegion(
      boundsToRegion(area.bounds),
      FOCUS_ANIMATION_MS,
    );
  }, []);

  const dismiss = useCallback(() => {
    lookupRef.current?.abort();
    setCandidates([]);
    setCandidateIndex(0);
  }, []);

  const handleMapPress = useCallback(async ({ nativeEvent }: MapPressEvent) => {
    lookupRef.current?.abort();

    const controller = new AbortController();
    lookupRef.current = controller;

    setIsResolving(true);
    try {
      const found = await fetchAreasAt(nativeEvent.coordinate, controller.signal);
      if (controller.signal.aborted) return;

      setCandidates(found);
      setCandidateIndex(0);

      if (found.length === 0) {
        showNotification({
          header: t('travelMap.nothingHere'),
          message: t('travelMap.nothingHereMessage'),
        });
      }
    } catch {
      if (controller.signal.aborted) return;

      setCandidates([]);
      showNotification({
        type: 'error',
        header: t('travelMap.lookupFailed'),
        message: t('travelMap.lookupFailedMessage'),
      });
    } finally {
      if (lookupRef.current === controller) {
        lookupRef.current = null;
        setIsResolving(false);
      }
    }
  }, [t]);

  const handlePlaceSelected = useCallback(
    (area: MapArea) => {
      lookupRef.current?.abort();
      setCandidates([area]);
      setCandidateIndex(0);
      focusOn(area);
    },
    [focusOn],
  );

  const chooseCandidate = useCallback(
    (index: number) => {
      setCandidateIndex(index);
      const candidate = candidates[index];
      if (candidate) focusOn(candidate);
    },
    [candidates, focusOn],
  );

  const markSelected = useCallback(() => {
    if (!selected) return;

    dispatch(areaMarked(selected));
    dismiss();
    showNotification({
      type: 'success',
      header: t('travelMap.marked', { name: selected.name }),
      message: t('travelMap.markedMessage'),
    });
  }, [dismiss, dispatch, selected, t]);

  const unmarkSelected = useCallback(() => {
    if (!selected) return;

    dispatch(areaUnmarked(selected.placeId));
    dismiss();
  }, [dismiss, dispatch, selected]);

  const unmark = useCallback(
    (placeId: string) => dispatch(areaUnmarked(placeId)),
    [dispatch],
  );

  const clearAll = useCallback(async () => {
    const confirmed = await confirm({
      title: t('travelMap.clearTitle'),
      message: t('travelMap.clearMessage', { count: areas.length }),
      confirmLabel: t('travelMap.clearConfirm'),
      icon: 'trash-outline',
      tone: 'danger',
    });

    if (confirmed) dispatch(travelMapCleared());
  }, [areas.length, confirm, dispatch, t]);

  return {
    mapRef,
    areas,
    isHydrated,
    markedIds,
    candidates,
    candidateIndex,
    selected,
    isSelectedMarked: selected ? markedIds.has(selected.placeId) : false,
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
  };
}

export default useTravelMap;
