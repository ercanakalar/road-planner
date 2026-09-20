interface FavoriteRouteTarget {
  id: string;
  userId?: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  archivedAt?: string | null;
}

interface FavoriteStopTarget {
  id: string;
  latitude: number;
  longitude: number;
  address?: string | null;
}

export interface FavoriteRouteRow {
  id: string;
  title?: string | null;
  description?: string | null;
  road?: FavoriteRouteTarget | null;
}

export interface FavoriteStopRow {
  id: string;
  title?: string | null;
  description?: string | null;
  stop?: FavoriteStopTarget | null;
}

export interface RawFavorites {
  ownRoads: FavoriteRouteRow[];
  ownStops: FavoriteStopRow[];
  othersRoads: FavoriteRouteRow[];
  othersStops: FavoriteStopRow[];
}

export type FavoriteKind = 'route' | 'stop';

export interface FavoriteEntry {
  favoriteId: string;
  targetId: string;
  kind: FavoriteKind;
  title: string;
  subtitle?: string;
  annotationTitle?: string;
  annotationDescription?: string;
  defaultTitle: string;
  isOwn: boolean;
  isWithdrawn?: boolean;
  address?: string;
}

export type FavoriteSectionKey =
  | 'ownRoutes'
  | 'ownStops'
  | 'othersRoutes'
  | 'othersStops';

export type NormalizedFavorites = Record<FavoriteSectionKey, FavoriteEntry[]>;

export type GetAllFavoritesArgs = void;
export type GetAllFavoritesResponse = NormalizedFavorites;

export interface ToggleFavoriteRouteArgs {
  routeId: string;
}

export interface ToggleFavoriteStopArgs {
  stopId: string;
  routeId?: string;
}

export type ToggleFavoriteResponse = { id: string } | null;

export interface UpdateFavoriteAnnotationArgs {
  favoriteId: string;
  kind: FavoriteKind;
  title?: string;
  description?: string;
}

export type UpdateFavoriteAnnotationResponse = {
  id: string;
  title: string | null;
  description: string | null;
};
