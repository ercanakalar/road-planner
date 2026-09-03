interface FavoriteRoadTarget {
  id: string;
  userId?: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  archivedAt?: string | null;
}

interface FavoriteWaypointTarget {
  id: string;
  latitude: number;
  longitude: number;
  /** The whole formatted address on one line, as Google returned it. */
  address?: string | null;
}

export interface FavoriteRoadRow {
  id: string;
  title?: string | null;
  description?: string | null;
  road?: FavoriteRoadTarget | null;
}

export interface FavoriteWaypointRow {
  id: string;
  title?: string | null;
  description?: string | null;
  waypoint?: FavoriteWaypointTarget | null;
}

export interface RawFavorites {
  ownRoads: FavoriteRoadRow[];
  ownWaypoints: FavoriteWaypointRow[];
  othersRoads: FavoriteRoadRow[];
  othersWaypoints: FavoriteWaypointRow[];
}

type FavoriteKind = 'road' | 'waypoint';

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
  | 'ownRoads'
  | 'ownWaypoints'
  | 'othersRoads'
  | 'othersWaypoints';

export type NormalizedFavorites = Record<FavoriteSectionKey, FavoriteEntry[]>;

export type GetAllFavoritesArgs = void;
export type GetAllFavoritesResponse = NormalizedFavorites;

export interface ToggleFavoriteRoadArgs {
  roadId: string;
}

export interface ToggleFavoriteWaypointArgs {
  waypointId: string;
  roadId?: string;
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
