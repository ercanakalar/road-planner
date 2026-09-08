type RootStackParamList = {
  HomeTabNavigator:
    | { screen?: string; params?: { highlightTargetId?: string } }
    | undefined;
  MapScreen: undefined;
  ShowRouteByIdScreen: { roadId: string };
  CommunityRouteScreen: { roadId: string; title?: string };
  SharedRouteScreen: { token: string };
  ShowStopById: { stopId: string };
  ProfileDetailScreen: { userId: string };
  ProfileScreen: { userId: string } | undefined;
  SettingsScreen: undefined;
  KvkkScreen: undefined;
  SignUpScreen: undefined;
  SignInScreen: undefined;
  ForgotPasswordScreen: { email?: string } | undefined;
  VerifyResetCodeScreen: { email: string };
  ResetPasswordScreen: { token: string; email: string };
  SearchScreen: { q?: string } | undefined;
  AuthorScreen: { authorId: string; displayName?: string };
};

type HomeTabParamList = {
  Home: undefined;
  Map: undefined;
  Routes: undefined;
  Favourites: { highlightTargetId?: string } | undefined;
  Profile: undefined;
};

export { RootStackParamList, HomeTabParamList };
