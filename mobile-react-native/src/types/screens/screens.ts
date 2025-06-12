type RootStackParamList = {
  Home: { post?: string };
  CreatePost: undefined;
  Details: { itemId?: number; otherParam?: string };
  Tab: undefined;
  Modal: undefined;
  Drawer: undefined;
  ProfileScreen: { accessToken: string; userId: string };
};

export { RootStackParamList };
