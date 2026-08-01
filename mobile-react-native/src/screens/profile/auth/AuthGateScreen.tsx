import React from 'react';
import { NavigationProp } from '@react-navigation/native';

import { useAppSelector } from 'store/hook';
import SignInScreen from './SignInScreen';
import ProfileScreen from '../ProfileScreen';
import { RootStackParamList } from 'types/screens/screens';

const AuthGate = ({
  navigation,
}: {
  navigation: NavigationProp<RootStackParamList>;
}) => {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  return isLoggedIn ? (
    <ProfileScreen navigation={navigation} />
  ) : (
    <SignInScreen navigation={navigation} />
  );
};

export default AuthGate;
