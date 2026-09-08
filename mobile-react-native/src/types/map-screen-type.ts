import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList } from './screens/screens';

type MapScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MapScreen'
>;


export type ShowRouteByIdRouteProp = RouteProp<
  RootStackParamList,
  'ShowRouteByIdScreen'
>;

export type MapScreenProps = {
  navigation: MapScreenNavigationProp;
};

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

type FavoriteStop = {
  id: string;
  userId: string;
  stopsId: string;
  createdAt: string;
  updatedAt: string;
};

type FavoriteRoad = {
  id: string;
  userId: string;
  roadId: string;
  createdAt: string;
  updatedAt: string;
};

export type SlopeGrade = 'flat' | 'gentle' | 'moderate' | 'steep';

export type BendShape =
  | 'straight'
  | 'slight'
  | 'moderate'
  | 'sharp'
  | 'hairpin';

export type BendDirection = 'left' | 'right';

/**
 * How the road runs at one stop, worked out by the server from the stops on
 * either side of it. Every field is null where there is nothing to measure: the
 * first stop has no climb behind it, the last has no turn ahead of it, and a
 * stop whose ground height was never resolved has no slope at all.
 */
export type StopShape = {
  /** Straight-line distance from the previous stop, in metres. */
  distanceFromPreviousMeters: number | null;
  /** Height gained since the previous stop; negative going downhill. */
  climbMeters: number | null;
  /** That climb as a percentage of the ground covered. */
  slopePercent: number | null;
  slopeGrade: SlopeGrade | null;
  /** How sharply the route turns here: 0 straight on, 180 doubling back. */
  bendDegrees: number | null;
  bendDirection: BendDirection | null;
  bendShape: BendShape | null;
};

export type StopWithAddress = StopShape & {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  roadId: string;
  /** Google's formatted address for the stop, or '' for a bare dropped pin. */
  address: string;
  /** Ground height in metres above sea level, or null if never resolved. */
  elevation: number | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
  favoriteStops: FavoriteStop[];
};

export type StopWithAddressAndId = {
  stops: StopWithAddress[];
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  favoriteRoads: FavoriteRoad[];
  isFavorite: boolean;
  isPublic?: boolean;
};

/**
 * One row of "My Routes". The list shows a name, a star and how many stops a
 * route holds, so the stops themselves are never sent — only their count.
 * Opening a route fetches it in full through `getRoadById`.
 */
export type OwnRoadSummary = {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  stopCount: number;
  isFavorite: boolean;
  isPublic?: boolean;
};
