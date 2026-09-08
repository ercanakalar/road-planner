export interface LocalStop {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  /** Google's formatted address, or '' for a bare dropped pin. */
  address: string;
  isFavorite?: boolean;
}

export interface LocalRoad {
  id: string;
  title: string;
  description: string;
  stops: LocalStop[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalRoadState {
  roads: LocalRoad[];
  activeRoadId?: string;
  isHydrated: boolean;
  isUploading: boolean;
}
