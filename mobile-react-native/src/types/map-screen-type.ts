import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList } from './screens/screens';

export type MapScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MapScreen'
>;

export type ShowRouteByIdScreenType = NativeStackScreenProps<
  RootStackParamList,
  'ShowRouteByIdScreen'
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

export type WaypointAddress = {
  id: string;
  address: string;
  country: string;
  district: string;
  province: string;
};

export type FavoriteWaypoint = {
  id: string;
  userId: string;
  wayPointsId: string;
  createdAt: string;
  updatedAt: string;
};

export type FavoriteRoad = {
  id: string;
  userId: string;
  roadId: string;
  createdAt: string;
  updatedAt: string;
};

export type WaypointWithAddress = {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
  roadId: string;
  addressInfoId: string;
  address: WaypointAddress;
  description?: string;
  createdAt: string;
  updatedAt: string;
  favoriteWaypoints: FavoriteWaypoint[];
};

export type WaypointWithAddressAndId = {
  wayPoints: WaypointWithAddress[];
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  favoriteRoads: FavoriteRoad[];
  isFavorite: boolean;
};
