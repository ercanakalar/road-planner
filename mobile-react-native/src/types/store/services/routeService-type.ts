import {
    OwnRouteSummary,
    StopShape,
    StopWithAddress,
    StopWithAddressAndId,
} from 'types/map-screen-type';

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

export type StopTerrain = {
    stopId: string;
    shape: StopShape | null;
};

export type GetRouteTerrainArgs = { routeId: string };
export type GetRouteTerrainResponse = StopTerrain[];
