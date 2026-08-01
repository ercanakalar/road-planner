import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import ScreenState from 'components/ScreenState';
import useWaypointLogic from 'hooks/useWaypointLogic';
import { colors, radius, shadows, spacing, typography } from 'theme';

const ShowWaypointByIdScreen = () => {
  const { mapRef, data, isLoading, isError, initialRegion } =
    useWaypointLogic();

  if (isLoading) {
    return <ScreenState variant='loading' title='Loading waypoint…' />;
  }

  if (isError || !data) {
    return (
      <ScreenState
        variant='error'
        title='Waypoint not found'
        message='It may have been removed from the route.'
      />
    );
  }

  const locality = [data.address?.district, data.address?.province]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        showsMyLocationButton
        initialRegion={initialRegion}
      >
        <Marker
          coordinate={{ latitude: data.latitude, longitude: data.longitude }}
          tracksViewChanges={false}
          pinColor={colors.accent}
        />
      </MapView>

      <View style={styles.infoCard}>
        {/* The detail endpoint does not join the address table, so the card
            falls back to coordinates rather than rendering blank lines. */}
        <Text style={styles.title} numberOfLines={2}>
          {data.address?.address ?? 'Saved place'}
        </Text>
        <Text style={styles.subtitle}>
          {locality ||
            `${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  infoCard: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.md,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default memo(ShowWaypointByIdScreen);
