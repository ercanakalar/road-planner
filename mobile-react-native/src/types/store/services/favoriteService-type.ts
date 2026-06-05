import { Waypoint } from 'types/map-screen-type';
import { FavoriteRoad } from 'types/screens/mapScreenType';
import { ToastType } from 'types/status-type';
import { RoadDetail } from './roadService-type';
import { ApiResponse } from './base-type';

export type AddFavoriteWaypointResponse = ApiResponse<Waypoint>;

export type AddFavoriteWaypointArgs = {
  accessToken: string;
  waypointId: string;
};

export type RemoveFavoriteWaypointArgs = {
  accessToken: string;
  favoriteId: string;
};

export type RemoveFavoriteWaypointResponse = ApiResponse<Waypoint>;

export type AddFavoriteRoadArgs = {
  accessToken: string;
  roadId: string;
};

export type AddFavoriteRoadResponse = ApiResponse<FavoriteRoad>;

export type RemoveFavoriteRoadArgs = {
  accessToken: string;
  favoriteId: string;
};

export type RemoveFavoriteRoadResponse = {
  status: ToastType;
  header: string;
  message: string;
};

export interface FavoriteWaypointWithRelation extends FavoriteRoad {
  wayPoints: Waypoint;
}

export interface FavoriteRoadWithRelation extends FavoriteRoad {
  road: RoadDetail;
}

export interface GetAllFavorites {
  ownWaypoints: FavoriteWaypointWithRelation[];
  ownRoads: FavoriteRoadWithRelation[];
  othersWaypoints: FavoriteWaypointWithRelation[];
  othersRoads: FavoriteRoadWithRelation[];
}

export type GetAllFavoritesResponse = ApiResponse<GetAllFavorites>;

export type GetAllFavoritesArgs = { accessToken: string };
