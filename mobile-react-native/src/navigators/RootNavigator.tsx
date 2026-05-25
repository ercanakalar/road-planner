import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeTabNavigator from './HomeTabNavigator';

import SignUpScreen from 'screens/profile/auth/SignUpScreen';
import SignInScreen from 'screens/profile/auth/SignInScreen';
import ShowRouteByIdScreen from 'screens/map/roads/ShowRouteByIdScreen';
import ProfileDetailScreen from 'screens/profile/profile-detail/ProfileDetailScreen';
import ProfileScreen from 'screens/profile/ProfileScreen';
import SettingsScreen from 'screens/profile/settings/SettingsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from 'types/screens/screens';
import ShowWaypointById from 'screens/map/roads/ShowWaypointById';

const Stack = createNativeStackNavigator<RootStackParamList>();
const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name='HomeTabNavigator'
        component={HomeTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name='ProfileDetailScreen'
        component={ProfileDetailScreen}
        options={{ title: 'Profile Detail' }}
      />
      <Stack.Screen
        name='SignUpScreen'
        component={SignUpScreen}
        options={{ title: 'Sign Up' }}
      />
      <Stack.Screen
        name='SignInScreen'
        component={SignInScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name='ShowRouteByIdScreen'
        component={ShowRouteByIdScreen}
        options={{ title: 'Route' }}
        initialParams={{ roadId: '0', accessToken: '' }}
      />
      <Stack.Screen name='ProfileScreen' component={ProfileScreen} />
      <Stack.Screen
        name='SettingsScreen'
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
       <Stack.Screen
        name='ShowWaypointById'
        component={ShowWaypointById}
        options={{ title: 'Waypoint' }}
        initialParams={{ waypointId: '0', accessToken: '' }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
