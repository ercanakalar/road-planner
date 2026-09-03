import {
  WaypointWithAddress,
  WaypointWithAddressAndId,
} from 'types/map-screen-type';

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


interface Address {
  id: string;
  country: string;
  province: string;
  district: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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


export interface WaypointAddressInput {
  address: string;
  country: string;
  province: string;
  district: string;
}

export interface WaypointInput {
  id?: string;
  latitude: number;
  longitude: number;
  order?: number;
  description?: string;
  address?: WaypointAddressInput;
}

export type GetOwnRoadsArgs = void;
export type GetOwnRoadsResponse = WaypointWithAddressAndId[];

export interface DiscoverRoad {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  author: string;
  stopCount: number;
  isFavorite: boolean;
  wayPoints: WaypointWithAddress[];
}

export interface ShareRoadArgs {
  roadId: string;
}

export interface ShareRoadResponse {
  url: string;
  token: string;
}

export interface GetSharedRoadArgs {
  token: string;
}

export type GetSharedRoadResponse = WaypointWithAddressAndId & {
  author: string;
  isFavorite: boolean;
};

export interface CloneRoadArgs {
  roadId: string;
}

export interface CloneRoadResponse {
  id: string;
  title: string;
}

export type GetDiscoverRoadsArgs = void;
export type GetDiscoverRoadsResponse = DiscoverRoad[];

export interface GetRoadByIdArgs {
  roadId: string;
}
export type GetRoadByIdResponse = WaypointWithAddressAndId;

export interface GetWaypointByIdArgs {
  waypointId: string;
}
export type GetWaypointByIdResponse = WaypointWithAddress;

export interface DeleteRoadByIdArgs {
  roadId: string;
}
export type DeleteRoadByIdResponse = null;

export interface CreateRoadArgs {
  title: string;
  description?: string;
  waypoints?: WaypointInput[];
}
export type CreateRoadResponse = WaypointWithAddressAndId;

export interface UpdateRoadByIdArgs {
  roadId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  waypoints?: WaypointInput[];
}
export type UpdateRoadByIdResponse = WaypointWithAddressAndId;

export interface AddWaypointArgs {
  roadId: string;
  waypoint: WaypointInput;
}
export type AddWaypointResponse = Waypoint;

export interface DeleteWaypointByRoadIdArgs {
  roadId: string;
  waypointId: string;
}
export type DeleteWaypointByRoadIdResponse = null;

export interface UpdateWaypointByWaypointIdArgs {
  roadId: string;
  waypointId: string;
  waypoint: WaypointInput;
}
export type UpdateWaypointByWaypointIdResponse = Waypoint;

export interface ReorderWaypointsArgs {
  roadId: string;
  from: number;
  to: number;
}
export type ReorderWaypointsResponse = Waypoint[];
