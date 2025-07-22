import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { RootStackParamList } from './screens/screens';
import { RouteProp } from '@react-navigation/native';

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

export type EditWaypointScreenProp = RouteProp<
  RootStackParamList,
  'EditWaypointScreen'
>;

export type MapScreenProps = {
  navigation: MapScreenNavigationProp;
};

export type Waypoint = {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  order: number;
};

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type Route = {
  key: string;
  name: string;
  params?: {
    newWaypoint?: Waypoint;
  };
};

export type WaypointAddress = {
  id: string;
  address: string;
  country: string;
  district: string;
  province: string;
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
};

export type WaypointWithAddressAndId = {
  wayPoints: WaypointWithAddress[];
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};
