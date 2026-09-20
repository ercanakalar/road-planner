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

type FavoriteRoute = {
  id: string;
  userId: string;
  routeId: string;
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

export type StopShape = {
  distanceFromPreviousMeters: number | null;
  climbMeters: number | null;
  slopePercent: number | null;
  slopeGrade: SlopeGrade | null;
  bendDegrees: number | null;
  bendDirection: BendDirection | null;
  bendShape: BendShape | null;
};

export type StopWithAddress = StopShape & {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  routeId: string;
  address: string;
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
  favoriteRoutes: FavoriteRoute[];
  isFavorite: boolean;
  isPublic?: boolean;
};

export type OwnRouteSummary = {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    stops: number
  };
  isFavorite: boolean;
  isPublic?: boolean;
};
