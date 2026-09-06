import { memo, useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import ScreenState from 'components/ui/ScreenState';
import PrimaryButton from 'components/ui/PrimaryButton';
import { MapSection } from 'components/map/MapSection';
import {
  useCloneRoadMutation,
  useGetRoadByIdQuery,
} from 'store/services/roadService';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import { useAppSelector } from 'store/hook';
import { useRouteLine } from 'hooks/useRouteDirections';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';
import { addressName } from 'utils/address';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const noop = () => {};

const CommunityRouteScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const mapRef = useRef<MapView | null>(null);

  const { params } =
    useRoute<RouteProp<RootStackParamList, 'CommunityRouteScreen'>>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const {
    data: road,
    isLoading,
    isError,
  } = useGetRoadByIdQuery({
    roadId: params.roadId,
  });
  const [toggleFavoriteRoad, { isLoading: isSaving }] =
    useToggleFavoriteRoadMutation();
  const [cloneRoad, { isLoading: isCloning }] = useCloneRoadMutation();

  const waypoints = useMemo(() => road?.wayPoints ?? [], [road?.wayPoints]);
  const routeLine = useRouteLine(waypoints, 'driving');

  const summary = useMemo(() => {
    if (routeLine.durationSeconds === undefined) return undefined;
    return {
      duration: secondsToHour(routeLine.durationSeconds),
      distance: metersToDistance(routeLine.distanceMeters),
    };
  }, [routeLine.distanceMeters, routeLine.durationSeconds]);

  const handleSave = useCallback(async () => {
    try {
      await toggleFavoriteRoad({ roadId: params.roadId }).unwrap();
    } catch {
      return;
    }

    navigation.navigate('HomeTabNavigator', {
      screen: 'Favourites',
      params: { highlightTargetId: params.roadId },
    });
  }, [navigation, params.roadId, toggleFavoriteRoad]);

  const goToSignIn = useCallback(
    () => navigation.navigate('SignInScreen'),
    [navigation],
  );

  const handleClone = useCallback(async () => {
    try {
      const copy = await cloneRoad({ roadId: params.roadId }).unwrap();
      navigation.navigate('ShowRouteByIdScreen', { roadId: copy.id });
    } catch {
    }
  }, [cloneRoad, navigation, params.roadId]);

  if (isLoading) {
    return <ScreenState variant='loading' title='Loading route…' />;
  }

  if (isError || !road) {
    return (
      <ScreenState
        variant='error'
        title='Route unavailable'
        message='It may have been unpublished by its owner.'
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <MapSection
          mapRef={mapRef}
          waypoints={waypoints}
          routeCoordinates={routeLine.coordinates}
          summary={summary}
          transportMode='driving'
          handleMarkerDragEnd={noop}
          onMapLongPress={noop}
          onMapPress={noop}
        />
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{road.title}</Text>
        {road.description ? (
          <Text style={styles.description}>{road.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons name='location-outline' size={14} color={colors.primary} />
          <Text style={styles.meta}>
            {waypoints.length} stop{waypoints.length === 1 ? '' : 's'}
          </Text>
          {road.isFavorite ? (
            <View style={styles.savedPill}>
              <Ionicons name='star' size={11} color={colors.warning} />
              <Text style={styles.savedText}>Saved</Text>
            </View>
          ) : null}
          <Text style={styles.readOnly}>Read only</Text>
        </View>

        {isLoggedIn ? (
          <>
            {road.isFavorite ? null : (
              <PrimaryButton
                label='Save to my favourites'
                onPress={handleSave}
                isLoading={isSaving}
              />
            )}

            <PrimaryButton
              label='Make a copy I can edit'
              variant='secondary'
              onPress={handleClone}
              isLoading={isCloning}
            />
            <Text style={styles.cloneHint}>
              A copy becomes your own route, so you can add and reorder stops.
              The original stays as its author left it.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.signedOut}>
              You can look at this route without an account. Create one to keep
              it in your favourites or make a copy you can edit.
            </Text>
            <PrimaryButton
              label='Sign in'
              variant='secondary'
              onPress={goToSignIn}
            />
          </>
        )}

        <View style={styles.stops}>
          {waypoints.map((waypoint, index) => (
            <View key={waypoint.id} style={styles.stop}>
              <View style={styles.stopIndex}>
                <Text style={styles.stopIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.stopText} numberOfLines={2}>
                {addressName(waypoint.address) ||
                  `${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    map: { flex: 1 },
    sheet: {
      maxHeight: '45%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    },
    sheetContent: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    description: {
      ...typography.body,
      color: colors.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: colors.primary,
      flex: 1,
    },
    readOnly: {
      ...typography.caption,
      color: colors.textSubtle,
    },
    savedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    savedText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textMuted,
    },
    cloneHint: {
      ...typography.caption,
      color: colors.textSubtle,
    },
    signedOut: {
      ...typography.caption,
      color: colors.textMuted,
    },
    stops: { gap: spacing.sm },
    stop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    stopIndex: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    stopIndexText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    stopText: {
      ...typography.caption,
      color: colors.text,
      flex: 1,
    },
  });

export default memo(CommunityRouteScreen);
