import type { RefObject } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type MapView from 'react-native-maps';

export interface LocateButtonProps {
  mapRef: RefObject<MapView | null>;
  style?: StyleProp<ViewStyle>;
  zoomDelta?: number;
  animationDuration?: number;
}
