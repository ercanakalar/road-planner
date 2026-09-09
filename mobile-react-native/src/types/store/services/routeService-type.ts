import {
  OwnRouteSummary,
  StopShape,
  StopWithAddress,
  StopWithAddressAndId,
} from 'types/map-screen-type';

/**
 * A route exactly as the API returns it. The `roadId` key is the server's own
 * name for the field, kept verbatim so this type still describes the payload
 * rather than what the app wishes it were called.
 */
export interface Route {
  id: string;
  userId: string;
  title: string;
  description: string;
  roadId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}


/** A stop as the API returns it; `roadId` is the server's key, kept verbatim. */
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

export type GetOwnRoutesArgs = void;
export type GetOwnRoutesResponse = OwnRouteSummary[];

export interface DiscoverRoute {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  author: string;
  stopCount: number;
  isFavorite: boolean;
  stops: StopWithAddress[];
}

export interface ShareRouteArgs {
  routeId: string;
}

export interface ShareRouteResponse {
  url: string;
  token: string;
}

export interface GetSharedRouteArgs {
  token: string;
}

export type GetSharedRouteResponse = StopWithAddressAndId & {
  author: string;
  isFavorite: boolean;
};

export interface CloneRouteArgs {
  routeId: string;
}

export interface CloneRouteResponse {
  id: string;
  title: string;
}

export type GetDiscoverRoutesArgs = void;
export type GetDiscoverRoutesResponse = DiscoverRoute[];

export interface GetRouteByIdArgs {
  routeId: string;
}
export type GetRouteByIdResponse = StopWithAddressAndId;

export interface GetStopByIdArgs {
  stopId: string;
}
export type GetStopByIdResponse = StopWithAddress;

export interface DeleteRouteByIdArgs {
  routeId: string;
}
export type DeleteRouteByIdResponse = null;

export interface CreateRouteArgs {
  title: string;
  description?: string;
  stops?: StopInput[];
}
export type CreateRouteResponse = StopWithAddressAndId;

export interface UpdateRouteByIdArgs {
  routeId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  stops?: StopInput[];
}
export type UpdateRouteByIdResponse = StopWithAddressAndId;

export interface AddStopArgs {
  routeId: string;
  stop: StopInput;
}
export type AddStopResponse = Stop;

export interface DeleteStopByRouteIdArgs {
  routeId: string;
  stopId: string;
}
export type DeleteStopByRouteIdResponse = null;

export interface UpdateStopByStopIdArgs {
  routeId: string;
  stopId: string;
  stop: StopInput;
}
export type UpdateStopByStopIdResponse = Stop;

export interface ReorderStopsArgs {
  routeId: string;
  from: number;
  to: number;
}
export type ReorderStopsResponse = Stop[];

/**
 * The road's own shape at one stop, measured along the route Google draws
 * rather than the straight line between pins. Same fields as the shape a stop
 * already carries, so a card can take whichever it has.
 */
export type StopTerrain = {
  stopId: string;
  /** Null for the first stop: nothing leads to it. */
  shape: StopShape | null;
};

export type GetRouteTerrainArgs = { routeId: string };
export type GetRouteTerrainResponse = StopTerrain[];
