import React, { useMemo } from 'react';
import {
  BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from 'screens/home/HomeScreen';
import MapScreen from 'screens/map/MapScreen';
import LocalMapScreen from 'screens/map/local/LocalMapScreen';
import AuthGate from 'screens/profile/auth/AuthGateScreen';

import { colors, shadows, spacing } from 'theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Map: 'navigate-outline',
  Routes: 'map-outline',
  Profile: 'person-outline',
};

const ACTIVE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Map: 'navigate',
  Routes: 'map',
  Profile: 'person',
};

/*
 * The session is restored once, before the navigator mounts (see SessionGate),
 * so this component no longer fires a refresh-token mutation on mount — the
 * old one called `.unwrap()` with no catch, which surfaced as an unhandled
 * rejection on every cold start without a token.
 */
const HomeTabNavigator = () => {
  const insets = useSafeAreaInsets();

  const screenOptions = useMemo(
    () =>
      ({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={
              (focused ? ACTIVE_ICONS[route.name] : ICONS[route.name]) ??
              'ellipse-outline'
            }
            color={color}
            size={size}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 56 + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom || spacing.sm,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      }),
    [insets.bottom],
  );

  return (
    <Tab.Navigator initialRouteName='Map' screenOptions={screenOptions}>
      <Tab.Screen name='Home' component={HomeScreen} />
      {/* Usable without an account; anything built here stays on the device. */}
      <Tab.Screen name='Map' component={LocalMapScreen} />
      <Tab.Screen name='Routes' component={MapScreen} />
      <Tab.Screen name='Profile' component={AuthGate} />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
