import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WaypointWithAddressAndId } from 'types/map-screen-type';
import { ToastType } from 'types/status-type';
import { RootStackParamList } from './screens';

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
  wayPoints: WayPointDetail;
}

export interface FavoriteRoadWithRelation extends FavoriteRoad {
  road: RoadDetail;
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
  onPress?: () => void;
  onRemove?: () => void;
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
