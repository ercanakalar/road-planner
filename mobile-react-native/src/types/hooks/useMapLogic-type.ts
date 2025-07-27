export interface Location {
  lat: number;
  lng: number;
}

export interface OnPlaceSelected {
  (location: Location, address: string): void;
}

export interface MarkerDragEndEvent {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface UpdatedWaypoint {
  latitude: number;
  longitude: number;
  address: string;
  order: number;
}

export interface MapLongPressEvent {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
}
