import { useMemo } from 'react';
import {
  BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

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

// The route names are identifiers; what the tab bar shows is translated.
const LABELS: Record<string, string> = {
  Home: 'tabs.home',
  Map: 'tabs.map',
  Routes: 'tabs.routes',
  Profile: 'tabs.profile',
};

const HomeTabNavigator = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const FavouritesTabButton = useMemo(
    () => centreTabButton('heart', t('tabs.favourites')),
    [t],
  );

  const insets = useSafeAreaInsets();

  const screenOptions = useMemo(
    () =>
      ({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        tabBarLabel: LABELS[route.name] ? t(LABELS[route.name]) : route.name,
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
    [colors, insets.bottom, t],
  );

  return (
    <Tab.Navigator initialRouteName='Map' screenOptions={screenOptions}>
      <Tab.Screen name='Home' component={HomeScreen} />
      <Tab.Screen name='Map' component={MapScreen} />
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
