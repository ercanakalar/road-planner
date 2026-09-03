export interface LocalWaypoint {
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
  wayPoints: LocalWaypoint[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalRoadState {
  roads: LocalRoad[];
  activeRoadId?: string;
  isHydrated: boolean;
  isUploading: boolean;
}
