import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Container from 'components/ui/Container';
import useRefreshControlColors from 'hooks/useRefreshControlColors';
import PrimaryButton from 'components/ui/PrimaryButton';
import { useAppSelector } from 'store/hook';
import {
  useGetDiscoverRoadsQuery,
  useGetOwnRoadsQuery,
} from 'store/services/roadService';
import DiscoverRoadCard from './DiscoverRoadCard';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import { DiscoverRoad } from 'types/store/services/roadService-type';
import { DISCOVER_REFRESH_MS } from 'constants/pagination';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const HomeScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const { data: roads } = useGetOwnRoadsQuery(undefined, { skip: !isLoggedIn });

  const {
    data: discoverRoads,
    isFetching: isDiscovering,
    refetch: refetchDiscover,
  } = useGetDiscoverRoadsQuery(undefined, {
    pollingInterval: DISCOVER_REFRESH_MS,
    refetchOnMountOrArgChange: true,
  });

  const stats = useMemo(() => {
    const routes = roads ?? [];
    return {
      routes: routes.length,
      stops: routes.reduce(
        (total, road) => total + (road.wayPoints?.length ?? 0),
        0,
      ),
      favorites: routes.filter((road) => road.isFavorite).length,
    };
  }, [roads]);

  const goToRoutes = useCallback(
    () => navigation.navigate('HomeTabNavigator', { screen: 'Routes' }),
    [navigation],
  );

  const goToSignIn = useCallback(
    () => navigation.navigate('SignInScreen'),
    [navigation],
  );

  const [toggleFavoriteRoad, { isLoading: isSavingFavorite }] =
    useToggleFavoriteRoadMutation();
  const [savingRoadId, setSavingRoadId] = useState<string | null>(null);

  const handleOpenCommunityRoad = useCallback(
    (road: DiscoverRoad) => {
      navigation.navigate('CommunityRouteScreen', {
        roadId: road.id,
        title: road.title,
      });
    },
    [navigation],
  );

  const handleToggleCommunityFavorite = useCallback(
    async (road: DiscoverRoad) => {
      if (!isLoggedIn) {
        goToSignIn();
        return;
      }

      setSavingRoadId(road.id);
      try {
        await toggleFavoriteRoad({ roadId: road.id }).unwrap();
        await refetchDiscover();
      } catch {
      } finally {
        setSavingRoadId(null);
      }
    },
    [goToSignIn, isLoggedIn, refetchDiscover, toggleFavoriteRoad],
  );

  return (
    <Container>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isDiscovering}
            onRefresh={refetchDiscover}
            {...refreshColors}
          />
        }
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Road Planner</Text>
          <Text style={styles.subtitle}>
            Plan multi-stop routes and compare how long each leg takes.
          </Text>
        </View>

        {isLoggedIn ? (
          <>
            <View style={styles.statsRow}>
              <Stat icon='map-outline' value={stats.routes} label='Routes' />
              <Stat icon='location-outline' value={stats.stops} label='Stops' />
              <Stat
                icon='star-outline'
                value={stats.favorites}
                label='Favourites'
              />
            </View>

            <PrimaryButton label='Open my routes' onPress={goToRoutes} />
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to get started</Text>
            <Text style={styles.cardBody}>
              Your routes, stops and favourites sync with your account.
            </Text>
            <PrimaryButton label='Sign in' onPress={goToSignIn} />
          </View>
        )}

        <View style={styles.discover}>
          <View style={styles.discoverHeader}>
            <View style={styles.discoverHeadings}>
              <Text style={styles.sectionTitle}>Routes from the community</Text>
              <Text style={styles.sectionHint}>
                A different handful every time you look.
              </Text>
            </View>

            <Pressable
              onPress={refetchDiscover}
              hitSlop={10}
              disabled={isDiscovering}
              accessibilityRole='button'
              accessibilityLabel='Show different routes'
              style={({ pressed }) => [
                styles.shuffle,
                pressed && styles.shufflePressed,
              ]}
            >
              {isDiscovering ? (
                <ActivityIndicator size='small' color={colors.primary} />
              ) : (
                <Ionicons name='shuffle' size={18} color={colors.primary} />
              )}
            </Pressable>
          </View>

          {discoverRoads?.length ? (
            discoverRoads.map((road) => (
              <DiscoverRoadCard
                key={road.id}
                road={road}
                canFavorite={isLoggedIn}
                isSaving={isSavingFavorite && savingRoadId === road.id}
                onOpen={handleOpenCommunityRoad}
                onToggleFavorite={handleToggleCommunityFavorite}
              />
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                {isDiscovering
                  ? 'Looking for published routes…'
                  : 'Nobody has published a route yet. Publish one of yours from its edit screen and it will show up here for everyone.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Container>
  );
};

const Stat = ({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      padding: spacing.lg,
      gap: spacing.xl,
    },
    heading: { gap: spacing.xs, paddingTop: spacing.sm },
    title: {
      width: '100%',
      textAlign: 'center',
      ...typography.display,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.sm,
    },
    statValue: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 25,
      color: colors.text,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
    discover: { gap: spacing.md },
    discoverHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    discoverHeadings: { flex: 1, gap: spacing.xxs },
    sectionTitle: {
      ...typography.title,
      color: colors.text,
    },
    sectionHint: {
      ...typography.caption,
      color: colors.textMuted,
    },
    shuffle: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
    },
    shufflePressed: { opacity: 0.7 },
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.sm,
    },
    cardTitle: {
      ...typography.heading,
      color: colors.text,
    },
    cardBody: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });

export default HomeScreen;
