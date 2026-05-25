import { WaypointWithAddress } from 'types/map-screen-type';

type RootStackParamList = {
  MapScreen: {};
  ShowRouteByIdScreen: { roadId: string; accessToken: string };
  HomeTabNavigator: { post?: string };
  CreatePost: undefined;
  Details: { itemId?: number; otherParam?: string };
  ProfileDetailScreen: { accessToken: string; userId: string };
  Tab: undefined;
  Modal: undefined;
  Drawer: undefined;
  ProfileScreen: { userId: string };
  EditWaypointScreen: {
    roadId: string;
    accessToken?: string;
    waypoint: WaypointWithAddress;
  };
  FavoriteRoutes: undefined;
  SettingsScreen: undefined;
  AllRoutes: undefined;
  SignUpScreen: undefined;
  SignInScreen: undefined;
  ShowWaypointById: { waypointId: string; accessToken: string };
};

export { RootStackParamList };
