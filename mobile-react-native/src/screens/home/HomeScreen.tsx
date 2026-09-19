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
import TravelMapCard from 'components/travel/TravelMapCard';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { useTranslation } from 'react-i18next';

const HomeScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();
  const { t } = useTranslation();

  const {
    isLoggedIn,
    firstName,
    stats,
    travelAreas,
    discoverRoutes,
    isDiscovering,
    refetchDiscover,
    savingRouteId,
    goToSignIn,
    goToSearch,
    goToTravelMap,
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
            {t('home.greeting', { name: firstName || t('home.traveller') })}
          </Text>
          <SearchBarButton onPress={goToSearch} />
        </View>

        {isLoggedIn ? (
          <View style={styles.statsRow}>
            <StatTile
              icon='map-outline'
              value={stats.routes}
              label={t('home.routes')}
            />
            <StatTile
              icon='location-outline'
              value={stats.stops}
              label={t('home.stops')}
            />
            <StatTile
              icon='heart-outline'
              value={stats.favorites}
              label={t('home.favourites')}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('home.signInToStart')}</Text>
            <Text style={styles.cardBody}>{t('home.syncHint')}</Text>
            <PrimaryButton label={t('common.signIn')} onPress={goToSignIn} />
          </View>
        )}

        {/* Above Discover, and outside the signed-in branch: the travel map is
            kept on the device, so it is there to open before anybody signs in. */}
        <TravelMapCard areas={travelAreas} onPress={goToTravelMap} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.discover')}</Text>

            <Pressable
              onPress={refetchDiscover}
              hitSlop={10}
              disabled={isDiscovering}
              accessibilityRole='button'
              accessibilityLabel={t('home.shuffle')}
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
                  ? t('home.lookingForRoutes')
                  : t('home.noneYet')}
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
      padding: spacing.md,
      gap: spacing.lg,
    },
    heading: { gap: spacing.sm, paddingTop: spacing.xs },
    greeting: {
      ...typography.title,
      color: colors.text,
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
    sectionTitle: {
      flex: 1,
      ...typography.heading,
      fontSize: 19,
      lineHeight: 25,
      color: colors.text,
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
      gap: spacing.sm,
      padding: spacing.md,
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
