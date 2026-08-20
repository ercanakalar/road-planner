import React, { memo, useCallback, useMemo, useRef } from 'react';
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
  useGetSharedRoadQuery,
} from 'store/services/roadService';
import { useToggleFavoriteRoadMutation } from 'store/services/favoriteService';
import { useAppSelector } from 'store/hook';
import { useRouteLine } from 'hooks/useRouteDirections';
import { metersToDistance, secondsToHour } from 'utils/secondsToHour';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const noop = () => {};

const SharedRouteScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const mapRef = useRef<MapView | null>(null);

  const { params } =
    useRoute<RouteProp<RootStackParamList, 'SharedRouteScreen'>>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  const {
    data: road,
    isLoading,
    isError,
  } = useGetSharedRoadQuery({ token: params.token });

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
    if (!road) return;

    try {
      await toggleFavoriteRoad({ roadId: road.id }).unwrap();
    } catch {
      return;
    }

    navigation.navigate('HomeTabNavigator', {
      screen: 'Favourites',
      params: { highlightTargetId: road.id },
    });
  }, [navigation, road, toggleFavoriteRoad]);

  const handleClone = useCallback(async () => {
    if (!road) return;

    try {
      const copy = await cloneRoad({ roadId: road.id }).unwrap();
      navigation.navigate('ShowRouteByIdScreen', { roadId: copy.id });
    } catch {
      return;
    }
  }, [cloneRoad, navigation, road]);

  const goToSignIn = useCallback(
    () => navigation.navigate('SignInScreen'),
    [navigation],
  );

  if (isLoading) {
    return <ScreenState variant='loading' title='Opening shared route…' />;
  }

  if (isError || !road) {
    return (
      <ScreenState
        variant='error'
        title='This link no longer works'
        message='Shared links expire, and the route behind this one may have been deleted by its owner.'
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
        <Text style={styles.author}>Shared by {road.author}</Text>
        {road.description ? (
          <Text style={styles.description}>{road.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons name='location-outline' size={14} color={colors.primary} />
          <Text style={styles.meta}>
            {waypoints.length} stop{waypoints.length === 1 ? '' : 's'}
          </Text>
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
                {waypoint.address?.address ??
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
    author: {
      ...typography.caption,
      color: colors.textMuted,
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
    signedOut: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
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

export default memo(SharedRouteScreen);
