import { WaypointAddressInput } from 'types/store/services/roadService-type';

export interface LocalWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  address: WaypointAddressInput;
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
