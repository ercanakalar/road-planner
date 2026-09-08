import {
  OwnRoadSummary,
  StopWithAddress,
  StopWithAddressAndId,
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


export interface Stop {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  roadId: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}


export interface StopInput {
  id?: string;
  latitude: number;
  longitude: number;
  order?: number;
  description?: string;
  address?: string;
}

export type GetOwnRoadsArgs = void;
export type GetOwnRoadsResponse = OwnRoadSummary[];

export interface DiscoverRoad {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  author: string;
  stopCount: number;
  isFavorite: boolean;
  stops: StopWithAddress[];
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

export type GetSharedRoadResponse = StopWithAddressAndId & {
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
export type GetRoadByIdResponse = StopWithAddressAndId;

export interface GetStopByIdArgs {
  stopId: string;
}
export type GetStopByIdResponse = StopWithAddress;

export interface DeleteRoadByIdArgs {
  roadId: string;
}
export type DeleteRoadByIdResponse = null;

export interface CreateRoadArgs {
  title: string;
  description?: string;
  stops?: StopInput[];
}
export type CreateRoadResponse = StopWithAddressAndId;

export interface UpdateRoadByIdArgs {
  roadId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  stops?: StopInput[];
}
export type UpdateRoadByIdResponse = StopWithAddressAndId;

export interface AddStopArgs {
  roadId: string;
  stop: StopInput;
}
export type AddStopResponse = Stop;

export interface DeleteStopByRoadIdArgs {
  roadId: string;
  stopId: string;
}
export type DeleteStopByRoadIdResponse = null;

export interface UpdateStopByStopIdArgs {
  roadId: string;
  stopId: string;
  stop: StopInput;
}
export type UpdateStopByStopIdResponse = Stop;

export interface ReorderStopsArgs {
  roadId: string;
  from: number;
  to: number;
}
export type ReorderStopsResponse = Stop[];
