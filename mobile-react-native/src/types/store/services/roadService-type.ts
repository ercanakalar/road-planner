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

export interface RoadDetail {
  id: string;
  userId: string;
  title: string;
  description?: string;
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

export interface FavoriteEntity {
  id: string;
}

export interface WaypointAddressInput {
  address: string;
  country: string;
  province: string;
  district: string;
}

export interface WaypointInput {
  latitude: number;
  longitude: number;
  order?: number;
  description?: string;
  address: WaypointAddressInput;
}

export type GetOwnRoadsArgs = void;
export type GetOwnRoadsResponse = WaypointWithAddressAndId[];

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
