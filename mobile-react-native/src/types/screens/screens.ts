type RootStackParamList = {
  HomeTabNavigator: { screen?: string } | undefined;
  MapScreen: undefined;
  ShowRouteByIdScreen: { roadId: string };
  ShowWaypointById: { waypointId: string };
  ProfileDetailScreen: { userId: string };
  ProfileScreen: { userId: string } | undefined;
  SettingsScreen: undefined;
  SignUpScreen: undefined;
  SignInScreen: undefined;
};

export { RootStackParamList };
