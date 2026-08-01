import {
  FavoriteEntry,
  FavoriteRoadRow,
  FavoriteSectionKey,
  FavoriteWaypointRow,
  NormalizedFavorites,
  RawFavorites,
} from 'types/store/services/favoriteService-type';

export const FAVORITE_SECTIONS: readonly FavoriteSectionKey[] = [
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

const toRoadEntry = (row: FavoriteRoadRow): FavoriteEntry => ({
  favoriteId: row.id,
  targetId: row.road?.id ?? row.id,
  kind: 'road',
  title: row.road?.title ?? row.title ?? 'Untitled route',
  subtitle: row.road?.description ?? row.description ?? undefined,
});

const toWaypointEntry = (row: FavoriteWaypointRow): FavoriteEntry => {
  const address = row.waypoint?.address;
  const locality = [address?.district, address?.province]
    .filter(Boolean)
    .join(', ');
  const coordinates = row.waypoint
    ? `${row.waypoint.latitude.toFixed(4)}, ${row.waypoint.longitude.toFixed(4)}`
    : undefined;

  return {
    favoriteId: row.id,
    targetId: row.waypoint?.id ?? row.id,
    kind: 'waypoint',
    title: address?.address ?? row.title ?? 'Saved place',
    subtitle: locality || coordinates,
  };
};

export const normalizeFavorites = (raw?: RawFavorites): NormalizedFavorites => {
  if (!raw) return EMPTY_FAVORITES;
  return {
    ownRoads: (raw.ownRoads ?? []).map(toRoadEntry),
    ownWaypoints: (raw.ownWaypoints ?? []).map(toWaypointEntry),
    othersRoads: (raw.othersRoads ?? []).map(toRoadEntry),
    othersWaypoints: (raw.othersWaypoints ?? []).map(toWaypointEntry),
  };
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
