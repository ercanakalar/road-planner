import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Container from 'components/ui/Container';
import PrimaryButton from 'components/ui/PrimaryButton';
import StatTile from 'components/ui/StatTile';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useHomeScreen from 'hooks/home/useHomeScreen';
import RouteSummaryRow from 'components/route/RouteSummaryRow';
import SearchBarButton from 'components/search/SearchBarButton';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

const HomeScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();

  const {
    isLoggedIn,
    firstName,
    stats,
    discoverRoutes,
    isDiscovering,
    refetchDiscover,
    savingRouteId,
    goToSignIn,
    goToSearch,
    handleOpenCommunityRoute,
    handleToggleCommunityFavorite,
  } = useHomeScreen();

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
          {/* Nobody has told us a name before they sign in, and "Hello,
              undefined" is worse than a friendly stranger. */}
          <Text style={styles.greeting}>
            Hello, {firstName || 'traveller'} 👋
          </Text>
          <Text style={styles.greetingHint}>Ready for your next adventure?</Text>
          <SearchBarButton onPress={goToSearch} />
        </View>

        {isLoggedIn ? (
          <View style={styles.statsRow}>
            <StatTile icon='map-outline' value={stats.routes} label='Routes' />
            <StatTile
              icon='location-outline'
              value={stats.stops}
              label='Stops'
            />
            <StatTile
              icon='heart-outline'
              value={stats.favorites}
              label='Favourites'
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to get started</Text>
            <Text style={styles.cardBody}>
              Your routes, stops and favourites sync with your account.
            </Text>
            <PrimaryButton label='Sign in' onPress={goToSignIn} />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeadings}>
              <Text style={styles.sectionTitle}>Discover</Text>
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
                pressed && styles.pressed,
              ]}
            >
              {isDiscovering ? (
                <ActivityIndicator size='small' color={colors.primary} />
              ) : (
                <Ionicons name='shuffle' size={18} color={colors.primary} />
              )}
            </Pressable>
          </View>

          {discoverRoutes.length ? (
            discoverRoutes.map((route) => (
              <RouteSummaryRow
                key={route.id}
                route={route}
                canFavorite={isLoggedIn}
                isSaving={savingRouteId === route.id}
                onOpen={handleOpenCommunityRoute}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.xl,
    },
    heading: { gap: spacing.sm, paddingTop: spacing.sm },
    greeting: {
      ...typography.title,
      color: colors.text,
    },
    greetingHint: {
      ...typography.body,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    section: { gap: spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    sectionHeadings: { flex: 1, gap: spacing.xxs },
    sectionTitle: {
      ...typography.heading,
      fontSize: 19,
      lineHeight: 25,
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
    pressed: { opacity: 0.7 },
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
