import type {
  LongPressEvent,
  MarkerDragStartEndEvent,
} from 'react-native-maps';

export interface Location {
  lat: number;
  lng: number;
}

export interface OnPlaceSelected {
  (location: Location, address: string): void;
}

export type MarkerDragEndEvent = MarkerDragStartEndEvent;
export type MapLongPressEvent = LongPressEvent;
