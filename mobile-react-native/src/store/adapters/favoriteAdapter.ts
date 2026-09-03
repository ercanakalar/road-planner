import {
  addressLocality,
  addressName,
  fullAddress,
} from 'utils/address';
import {
  FavoriteEntry,
  FavoriteRoadRow,
  FavoriteSectionKey,
  FavoriteWaypointRow,
  NormalizedFavorites,
  RawFavorites,
} from 'types/store/services/favoriteService-type';

/** The four buckets the API splits favourites into, in the order they show. */
export const FAVORITE_SECTION_KEYS: readonly FavoriteSectionKey[] = [
  'ownRoads',
  'ownWaypoints',
  'othersRoads',
  'othersWaypoints',
] as const;

export const EMPTY_FAVORITES: NormalizedFavorites = {
  ownRoads: [],
  ownWaypoints: [],
  othersRoads: [],
  othersWaypoints: [],
};

const toRoadEntry =
  (isOwn: boolean) =>
  (row: FavoriteRoadRow): FavoriteEntry => {
    const defaultTitle = row.road?.title ?? 'Untitled route';
    return {
      favoriteId: row.id,
      targetId: row.road?.id ?? row.id,
      kind: 'road',
      title: row.title || defaultTitle,
      subtitle: row.description || row.road?.description || undefined,
      annotationTitle: row.title ?? undefined,
      annotationDescription: row.description ?? undefined,
      defaultTitle,
      isOwn,
      isWithdrawn: !!row.road?.archivedAt,
    };
  };

const toWaypointEntry =
  (isOwn: boolean) =>
  (row: FavoriteWaypointRow): FavoriteEntry => {
    const address = row.waypoint?.address;
    const coordinates = row.waypoint
      ? `${row.waypoint.latitude.toFixed(4)}, ${row.waypoint.longitude.toFixed(4)}`
      : undefined;

    // A pin dropped away from any address arrives with nothing usable — a Plus
    // Code, or an empty string — and coordinates are then the only honest label.
    const defaultTitle = addressName(address) || coordinates || 'Saved place';

    return {
      favoriteId: row.id,
      targetId: row.waypoint?.id ?? row.id,
      kind: 'waypoint',
      title: row.title || defaultTitle,
      subtitle: row.description || addressLocality(address) || coordinates,
      annotationTitle: row.title ?? undefined,
      annotationDescription: row.description ?? undefined,
      defaultTitle,
      isOwn,
      address: fullAddress(address) || undefined,
    };
  };

export const normalizeFavorites = (raw?: RawFavorites): NormalizedFavorites => {
  if (!raw) return EMPTY_FAVORITES;
  return {
    ownRoads: (raw.ownRoads ?? []).map(toRoadEntry(true)),
    ownWaypoints: (raw.ownWaypoints ?? []).map(toWaypointEntry(true)),
    othersRoads: (raw.othersRoads ?? []).map(toRoadEntry(false)),
    othersWaypoints: (raw.othersWaypoints ?? []).map(toWaypointEntry(false)),
  };
};

export const applyFavoriteAnnotation = (
  draft: NormalizedFavorites,
  favoriteId: string,
  annotation: { title?: string | null; description?: string | null },
) => {
  FAVORITE_SECTION_KEYS.forEach((section) => {
    const entry = draft[section].find(
      (candidate) => candidate.favoriteId === favoriteId,
    );
    if (!entry) return;

    if (annotation.title !== undefined) {
      entry.annotationTitle = annotation.title || undefined;
      entry.title = annotation.title || entry.defaultTitle;
    }
    if (annotation.description !== undefined) {
      entry.annotationDescription = annotation.description || undefined;
      entry.subtitle = annotation.description || entry.subtitle;
    }
  });
};

export const removeFromFavorites = (
  draft: NormalizedFavorites,
  targetId: string,
) => {
  FAVORITE_SECTION_KEYS.forEach((section) => {
    draft[section] = draft[section].filter(
      (entry) => entry.targetId !== targetId,
    );
  });
};
