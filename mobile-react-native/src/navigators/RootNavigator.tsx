import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeTabNavigator from './HomeTabNavigator';

import SignUpScreen from 'screens/menu/auth/SignUpScreen';
import SignInScreen from 'screens/menu/auth/SignInScreen';
import EditWaypointScreen from 'screens/map/EditWaypointScreen';
import ProfileScreen from 'screens/menu/profile/ProfileScreen';
import MenuScreen from 'screens/menu/MenuScreen';
import ShowRouteByIdScreen from 'screens/map/ShowRouteByIdScreen';

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
      />
      <Stack.Screen
        name='ProfileScreen'
        component={ProfileScreen}
        options={{ title: 'Profile' }}
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
      />
      <Stack.Screen
        name="Menu"
        component={MenuScreen}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
