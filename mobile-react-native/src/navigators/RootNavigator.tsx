import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeTabNavigator from './HomeTabNavigator';
import AddWaypointScreen from '../screens/AddWaypointScreen';
import MenuScreen from 'screens/MenuScreen';
import ProfileScreen from 'screens/ProfileScreen';
import SignUpScreen from 'screens/auth/SignUpScreen';
import SignInScreen from 'screens/auth/SignInScreen';

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
        name='AddWaypointScreen'
        component={AddWaypointScreen}
        options={{ title: 'Add Waypoint' }}
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
        name="Menu"
        component={MenuScreen}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
