export interface FavoriteRoadTarget {
  id: string;
  userId?: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  archivedAt?: string | null;
}

export interface FavoriteWaypointTarget {
  id: string;
  latitude: number;
  longitude: number;
  address?: {
    country?: string | null;
    province?: string | null;
    district?: string | null;
    address?: string | null;
  } | null;
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

export type FavoriteKind = 'road' | 'waypoint';

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
