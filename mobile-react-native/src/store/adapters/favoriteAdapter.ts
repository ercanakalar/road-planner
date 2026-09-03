import {
  FavoriteEntry,
  FavoriteRoadRow,
  FavoriteSectionKey,
  FavoriteWaypointRow,
  NormalizedFavorites,
  RawFavorites,
} from 'types/store/services/favoriteService-type';

const FAVORITE_SECTIONS: readonly FavoriteSectionKey[] = [
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
    const locality = [address?.district, address?.province]
      .filter(Boolean)
      .join(', ');
    const coordinates = row.waypoint
      ? `${row.waypoint.latitude.toFixed(4)}, ${row.waypoint.longitude.toFixed(4)}`
      : undefined;

    const defaultTitle = address?.address ?? 'Saved place';

    return {
      favoriteId: row.id,
      targetId: row.waypoint?.id ?? row.id,
      kind: 'waypoint',
      title: row.title || defaultTitle,
      subtitle: row.description || locality || coordinates,
      annotationTitle: row.title ?? undefined,
      annotationDescription: row.description ?? undefined,
      defaultTitle,
      isOwn,
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
  FAVORITE_SECTIONS.forEach((section) => {
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
  FAVORITE_SECTIONS.forEach((section) => {
    draft[section] = draft[section].filter(
      (entry) => entry.targetId !== targetId,
    );
  });
};
