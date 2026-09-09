import { useMemo } from 'react';
import {
  BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from 'screens/home/HomeScreen';
import MapScreen from 'screens/map/MapScreen';
import RoutesScreen from 'screens/routes/RoutesScreen';
import FavoritesScreen from 'screens/favorites/FavoritesScreen';
import AuthGate from 'screens/profile/AuthGateScreen';
import { centreTabButton } from './CentreTabButton';

import { StyleSheet } from 'react-native';

import { shadows, spacing, useTheme } from 'theme';

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

// Built once, out here: `tabBarButton` is called on every render of the bar,
// and a function built inside one would remount the button each time.
const FavouritesTabButton = centreTabButton('heart', 'Favourites');

const HomeTabNavigator = () => {
  const { colors } = useTheme();

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
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom || spacing.sm,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: -0.1,
          marginTop: spacing.xxs,
        },
        tabBarItemStyle: { paddingVertical: spacing.xxs },
        headerShown: false,
      }),
    [colors, insets.bottom],
  );

  return (
    <Tab.Navigator initialRouteName='Map' screenOptions={screenOptions}>
      <Tab.Screen name='Home' component={HomeScreen} />
      <Tab.Screen name='Map' component={MapScreen} />
      {/*
        Favourites takes the middle, drawn as the raised circle rather than as
        a third flat tab. Every screen name here is unchanged, so
        `navigate('Favourites')` from the community and shared-route screens —
        highlight param and all — still lands where it did.
      */}
      <Tab.Screen
        name='Favourites'
        component={FavoritesScreen}
        options={{ tabBarButton: FavouritesTabButton, tabBarLabel: '' }}
      />
      <Tab.Screen name='Routes' component={RoutesScreen} />
      <Tab.Screen name='Profile' component={AuthGate} />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;
