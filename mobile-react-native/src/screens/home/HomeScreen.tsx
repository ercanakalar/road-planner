import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Container from 'components/Container';
import PrimaryButton from 'components/PrimaryButton';
import { useAppSelector } from 'store/hook';
import { useGetOwnRoadsQuery } from 'store/services/roadService';

import { colors, radius, shadows, spacing, typography } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const { data: roads } = useGetOwnRoadsQuery(undefined, { skip: !isLoggedIn });

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

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.content}>
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
}) => (
  <View style={styles.stat}>
    <Ionicons name={icon} size={20} color={colors.primary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  heading: { gap: spacing.sm, paddingTop: spacing.lg },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 19,
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
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
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
