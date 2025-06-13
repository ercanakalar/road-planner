import React from 'react';
import { NavigationProp } from '@react-navigation/native';

import { useAppSelector } from 'store/hook';
import SignInScreen from './SignInScreen';
import ProfileScreen from '../ProfileScreen';

const AuthGate = ({ navigation }: { navigation: NavigationProp<any> }) => {
  const { accessToken } = useAppSelector((state) => state.auth);
  const isLoggedIn = !!accessToken;

  return isLoggedIn ? (
    <ProfileScreen navigation={navigation} />
  ) : (
    <SignInScreen navigation={navigation} />
  );
};

export default AuthGate;
