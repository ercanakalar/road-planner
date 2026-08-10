import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeTabNavigator from './HomeTabNavigator';

import SignUpScreen from 'screens/profile/auth/SignUpScreen';
import SignInScreen from 'screens/profile/auth/SignInScreen';
import ForgotPasswordScreen from 'screens/profile/auth/ForgotPasswordScreen';
import VerifyResetCodeScreen from 'screens/profile/auth/VerifyResetCodeScreen';
import ResetPasswordScreen from 'screens/profile/auth/ResetPasswordScreen';
import ShowRouteByIdScreen from 'screens/map/roads/ShowRouteByIdScreen';
import CommunityRouteScreen from 'screens/map/roads/CommunityRouteScreen';
import SharedRouteScreen from 'screens/map/roads/SharedRouteScreen';
import ShowWaypointById from 'screens/map/roads/ShowWaypointById';
import ProfileDetailScreen from 'screens/profile/profile-detail/ProfileDetailScreen';
import SettingsScreen from 'screens/profile/settings/SettingsScreen';

import { useTheme } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontSize: 17, fontWeight: '700' },
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
        name='CommunityRouteScreen'
        component={CommunityRouteScreen}
        options={({ route }) => ({
          title: route.params?.title ?? 'Community route',
        })}
      />
      <Stack.Screen
        name='SharedRouteScreen'
        component={SharedRouteScreen}
        options={{ title: 'Shared route' }}
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
        name='ForgotPasswordScreen'
        component={ForgotPasswordScreen}
        options={{ title: 'Forgot password' }}
      />
      <Stack.Screen
        name='VerifyResetCodeScreen'
        component={VerifyResetCodeScreen}
        options={{ title: 'Enter code' }}
      />
      <Stack.Screen
        name='ResetPasswordScreen'
        component={ResetPasswordScreen}
        options={{ title: 'New password', headerBackVisible: false }}
      />
      <Stack.Screen
        name='SettingsScreen'
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
