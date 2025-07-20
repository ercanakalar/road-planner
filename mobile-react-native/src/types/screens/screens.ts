type RootStackParamList = {
  MapScreen: {};
  ShowRouteByIdScreen: { routeId: string; accessToken: string };
  Home: { post?: string };
  CreatePost: undefined;
  Details: { itemId?: number; otherParam?: string };
  Tab: undefined;
  Modal: undefined;
  Drawer: undefined;
  ProfileScreen: { accessToken: string; userId: string };
  EditWaypointScreen: { routeId: string; accessToken?: string };
};

export { RootStackParamList };
