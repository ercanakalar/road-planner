import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeTabNavigator from './HomeTabNavigator';

import SignUpScreen from 'screens/profile/auth/SignUpScreen';
import SignInScreen from 'screens/profile/auth/SignInScreen';
import EditWaypointScreen from 'screens/map/edit/EditWaypointScreen';
import ShowRouteByIdScreen from 'screens/map/by-id/ShowRouteByIdScreen';
import ProfileDetailScreen from 'screens/profile/profile-detail/ProfileDetailScreen';
import ProfileScreen from 'screens/profile/ProfileScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name='HomeTabNavigator'
        component={HomeTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name='EditWaypointScreen'
        component={EditWaypointScreen}
        options={{ title: 'Edit Waypoint' }}
        initialParams={{ routeId: '0' }}
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
        initialParams={{ routeId: '0', accessToken: '' }}
      />
      <Stack.Screen name='Profile' component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
