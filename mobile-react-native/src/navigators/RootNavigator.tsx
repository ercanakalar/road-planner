import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeTabNavigator from './HomeTabNavigator';

import SignUpScreen from 'screens/profile/auth/SignUpScreen';
import SignInScreen from 'screens/profile/auth/SignInScreen';
import ShowRouteByIdScreen from 'screens/map/roads/ShowRouteByIdScreen';
import ShowWaypointById from 'screens/map/roads/ShowWaypointById';
import ProfileDetailScreen from 'screens/profile/profile-detail/ProfileDetailScreen';
import SettingsScreen from 'screens/profile/settings/SettingsScreen';

import { colors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerTintColor: colors.text,
      headerStyle: { backgroundColor: colors.surface },
      headerTitleStyle: { fontSize: 17, fontWeight: '600' },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen
      name='HomeTabNavigator'
      component={HomeTabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name='ShowRouteByIdScreen'
      component={ShowRouteByIdScreen}
      options={{ title: 'Route' }}
    />
    <Stack.Screen
      name='ShowWaypointById'
      component={ShowWaypointById}
      options={{ title: 'Waypoint' }}
    />
    <Stack.Screen
      name='ProfileDetailScreen'
      component={ProfileDetailScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen
      name='SignUpScreen'
      component={SignUpScreen}
      options={{ title: 'Create account' }}
    />
    <Stack.Screen
      name='SignInScreen'
      component={SignInScreen}
      options={{ title: 'Sign in' }}
    />
    <Stack.Screen
      name='SettingsScreen'
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </Stack.Navigator>
);

export default RootNavigator;
