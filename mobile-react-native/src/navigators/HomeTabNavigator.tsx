import React, { lazy, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from 'store/hook';
import { useValidateRefreshTokenMutation } from 'store/services/authenticationService';

import localStorageService from 'services/localStorageService';

import HomeScreen from 'screens/home/HomeScreen';
import SignInScreen from 'screens/profile/auth/SignInScreen';
import MapScreen from 'screens/map/MapScreen';
import ChatScreen from 'screens/chat/ChatScreen';

import { TokenType } from 'types/libs/auth';
import { useDispatch } from 'react-redux';
import { setUserId } from 'store/slices/authSlice';
import jwtService from 'services/jwtService';

const ProfileScreen = lazy(() => import('screens/profile/ProfileScreen'));

const Tab = createBottomTabNavigator();

const HomeTabNavigator = () => {
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const [validateRefreshToken] = useValidateRefreshTokenMutation();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkRefreshToken = async () => {
      try {
        const refreshToken = await localStorageService.getItem(TokenType.REFRESH_TOKEN);
        const accessToken = await localStorageService.getItem(TokenType.ACCESS_TOKEN);
        await validateRefreshToken({ accessToken, refreshToken }).unwrap();
      } catch (error) {
        console.error('Invalid refresh token', error);
      }
    };

    checkRefreshToken();
  }, [validateRefreshToken]);

  useEffect(() => {
    const fetchAndSetUserId = async () => {
      const decoded: any = await jwtService.decodeToken();
      dispatch(setUserId(decoded?.userId));
    };

    fetchAndSetUserId();
  }, [dispatch]);

  return (
    <Tab.Navigator
      initialRouteName='Home'
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = '';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Map') {
            iconName = 'map-marker';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Profile') {
            iconName = 'menu';
          }

          return <Icon name={iconName} color={color} size={size} />;
        },
        tabBarActiveTintColor: '#e91e63',
        tabBarInactiveTintColor: '#000000',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingVertical: 10,
          height: 100,
        },
        tabBarLabelStyle: {
          paddingBottom: 8,
          fontSize: 12,
          fontWeight: 'bold',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name='Home'
        component={HomeScreen}
      />
      <Tab.Screen
        name='Map'
        component={MapScreen}

      />
      <Tab.Screen
        name='Chat'
        component={ChatScreen}
      />
      <Tab.Screen
        name='Profile'
        component={isLoggedIn ? ProfileScreen : SignInScreen}
      />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;