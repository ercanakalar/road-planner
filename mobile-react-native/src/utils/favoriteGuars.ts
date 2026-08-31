import {
  FavoriteRoadWithRelation,
  FavoriteWaypointWithRelation,
} from 'types/screens/mapScreenType';

export function isFavoriteRoad(
  item: FavoriteRoadWithRelation | FavoriteWaypointWithRelation,
): item is FavoriteRoadWithRelation {
  return 'road' in item;
}

export function isFavoriteWaypoint(
  item: FavoriteRoadWithRelation | FavoriteWaypointWithRelation,
): item is FavoriteWaypointWithRelation {
  return 'waypoint' in item;
}
