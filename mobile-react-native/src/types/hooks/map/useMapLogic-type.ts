import type { LongPressEvent, MarkerDragStartEndEvent } from 'react-native-maps';

import type { MapArea } from 'types/travel-map';

export interface OnPlaceSelected {
  (place: MapArea): void;
}

export type MarkerDragEndEvent = MarkerDragStartEndEvent;
export type MapLongPressEvent = LongPressEvent;
