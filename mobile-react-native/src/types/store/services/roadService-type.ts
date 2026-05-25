import { ApiResponse } from './base-type';

export interface Road {
  id: string;
  userId: string;
  title: string;
  description: string;
  roadId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RoadDetail {
  id: string;
  userId: string;
  title: string;
  description?: string;
}

export interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  roadId: string;
  addressInfoId: string;
  address?: Address;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Address {
  id: string;
  country: string;
  province: string;
  district: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FavoriteEntity {
  id: string;
}

export interface GetOwnRoadsArgs {
  accessToken: string;
}

export type GetOwnRoadsResponse = ApiResponse<
  Road[] & {
    waypoints: Waypoint[] &
      { favoriteWaypoints: string[]; isfavorite: boolean }[];
    favoriteRoads: string[];
    favoriteWaypoints: string[];
  }
>;

export interface GetRoadByIdArgs {
  accessToken: string;
  roadId: string;
}

export type GetRoadByIdResponse = ApiResponse<
  Array<
    Road & {
      waypoints: Array<Waypoint & { favoriteWaypoints: string[] }>;
      favoriteRoads: string[];
      favoriteWaypoints: string[];
    }
  >
>;

export type DeleteRoadByIdArgs = {
  accessToken: string;
  roadId: string;
};

export type DeleteRoadByIdResponse = ApiResponse<null>;

export type AddWaypointArgs = {
  accessToken: string;
  roadId: string;
  waypoint: {
    latitude: number;
    longitude: number;
    order: number;
    description?: string;
    address: {
      address: string;
      country: string;
      province: string;
      district: string;
      name: string;
    };
  };
};

export type AddWaypointResponse = ApiResponse<Waypoint>;

export type DeleteWaypointByRoadIdArgs = {
  accessToken: string;
  roadId: string;
  waypointId: string;
};

export type DeleteWaypointByRoadIdResponse = ApiResponse<null>;

export type UpdateWaypointByWaypointIdArgs = {
  accessToken: string;
  roadId: string;
  waypointId: string;
  waypoint: {
    latitude: number;
    longitude: number;
    description?: string;
    address: {
      address: string;
      country: string;
      province: string;
      district: string;
      name: string;
    };
  };
};

export type UpdateWaypointByWaypointIdResponse = ApiResponse<Waypoint>;

export type ReorderWaypointsArgs = {
  accessToken: string;
  roadId: string;
  from: number;
  to: number;
};

export type ReorderWaypointsResponse = ApiResponse<Waypoint[]>;

export type GetWaypointByIdArgs = {
  accessToken: string;
  waypointId: string;
};

export type GetWaypointByIdResponse = ApiResponse<
  Waypoint & {
    address: Address;
    favoriteWaypoints: string[];
    isFavorite: boolean;
  }
>;
