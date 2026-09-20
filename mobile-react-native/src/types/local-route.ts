export interface LocalStop {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  address: string;
  isFavorite?: boolean;
}

export interface LocalRoute {
  id: string;
  title: string;
  description: string;
  stops: LocalStop[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalRouteState {
  routes: LocalRoute[];
  activeRouteId?: string;
  isHydrated: boolean;
  isUploading: boolean;
}
