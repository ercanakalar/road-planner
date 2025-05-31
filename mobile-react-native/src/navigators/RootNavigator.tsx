import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeTabNavigator from './HomeTabNavigator';
import AddWaypointScreen from '../screens/AddWaypointScreen';
import MenuScreen from 'screens/MenuScreen';
import { Button, Text, View } from 'react-native';

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
        name="Menu"
        component={MenuScreen}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
