import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';
import { ToastType } from 'types/status-type';
import { RootStackParamList } from './screens';
import MapView, {
  LongPressEvent,
  MarkerDragStartEndEvent,
} from 'react-native-maps';

export type WaypointRoute = NativeStackScreenProps<
  RootStackParamList,
  'ShowWaypointById'
>['route'];

export interface FavoriteWaypoint {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  waypointId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FavoriteRoad {
  id: string;
  userId: string;
  roadId: string;
  title: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WayPointDetail {
  id: string;
  latitude: number;
  longitude: number;
}

export interface RoadDetail {
  id: string;
  userId: string;
  title: string;
  description?: string;
}

export interface FavoriteWaypointWithRelation extends FavoriteWaypoint {
  wayPoints?: WayPointDetail;
}

export interface FavoriteRoadWithRelation extends FavoriteRoad {
  road?: RoadDetail;
}

export interface GetAllFavoritesResponse {
  status: ToastType;
  header: string;
  message: string;
  data: {
    ownWaypoints: FavoriteWaypointWithRelation[];
    ownRoads: FavoriteRoadWithRelation[];
    othersWaypoints: FavoriteWaypointWithRelation[];
    othersRoads: FavoriteRoadWithRelation[];
  };
}

export type GetAllFavorites = {
  ownWaypoints: FavoriteWaypointWithRelation[];
  ownRoads: FavoriteRoadWithRelation[];
  othersWaypoints: FavoriteWaypointWithRelation[];
  othersRoads: FavoriteRoadWithRelation[];
};

export interface FavoriteServiceResponse<T = any> {
  status: ToastType;
  header: string;
  message: string;
  data?: T;
}

export interface FavoriteSections {
  ownRoads: FavoriteItem[];
  ownWaypoints: FavoriteItem[];
  othersRoads: FavoriteItem[];
  othersWaypoints: FavoriteItem[];
}

export interface FavoriteItemProps {
  item: any;
  onPress: () => void;
  onRemove: () => void;
}

export interface FavoriteSectionProps {
  section: Section<FavoriteItem>;
  isExpanded: boolean;
  onToggle: () => void;
  onItemPress: (item: FavoriteItem) => void;
  onRemove: (item: FavoriteItem) => void;
}

interface Section<T> {
  key: string;
  title: string;
  icon: string;
  data: T[];
}

export interface RoutesListProps {
  data: WaypointWithAddressAndId[];
  accessToken: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleFavorite: (road: WaypointWithAddressAndId) => void;
  onDelete: (roadId: string) => void;
  onView: (roadId: string) => void;
}

export type FavoriteItem =
  | FavoriteRoadWithRelation
  | FavoriteWaypointWithRelation;

export interface MapSectionProps {
  waypoints: WaypointWithAddress[];
  routeCoordinates: { latitude: number; longitude: number }[];
  selectedMarkerId?: string;
  isDragging?: boolean;
  handleMarkerDragEnd: (
    event: MarkerDragStartEndEvent,
    waypointId: string,
  ) => void;
  onMapLongPress: (event: LongPressEvent) => void;
  ref: React.RefObject<MapView | null> ;
}
