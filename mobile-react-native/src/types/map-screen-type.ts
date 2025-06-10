import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MapScreen: undefined;
  HomeTabNavigator: undefined;
  SignUpScreen: undefined;
  SignInScreen: undefined;
  ProfileScreen: undefined;
  Menu: undefined;

  ShowRouteByIdScreen: { routeId: string };
  EditWaypointScreen: { routeId: string };
};

export type MapScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MapScreen'
>;

export type ShowRouteByIdScreenType = NativeStackScreenProps<RootStackParamList, 'ShowRouteByIdScreen'>;

export type MapScreenProps = {
  navigation: MapScreenNavigationProp;
};

export type Waypoint = {
  id: number;
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
