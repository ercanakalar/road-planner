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
  /** The whole formatted address on one line, as Google returned it. */
  address?: string | null;
}

/**
 * One favourited route, as the API returns it. The nested target arrives under
 * `road` — the server's word — so the key stays even though everything above
 * `normalizeFavorites` calls it a route.
 */
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

/** The four buckets as the API sends them, under the server's own names. */
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
  /** Places only: the full address, for copying. Absent for a saved route. */
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
