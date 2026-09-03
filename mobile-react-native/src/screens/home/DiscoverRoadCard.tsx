import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { DiscoverRoad } from 'types/store/services/roadService-type';
import { addressLocality, addressName } from 'utils/address';

const placeOf = (road: DiscoverRoad, index: number) => {
  const waypoint = road.wayPoints[index];
  return (
    addressLocality(waypoint?.address) || addressName(waypoint?.address) || null
  );
};

interface Props {
  road: DiscoverRoad;
  isSaving?: boolean;
  canFavorite?: boolean;
  onOpen: (road: DiscoverRoad) => void;
  onToggleFavorite: (road: DiscoverRoad) => void;
}

const DiscoverRoadCard = ({
  road,
  isSaving,
  canFavorite = true,
  onOpen,
  onToggleFavorite,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleOpen = useCallback(() => onOpen(road), [onOpen, road]);

  const handleToggleFavorite = useCallback(
    () => onToggleFavorite(road),
    [onToggleFavorite, road],
  );

  const route = useMemo(() => {
    const from = placeOf(road, 0);
    const to = placeOf(road, road.wayPoints.length - 1);
    if (!from || !to || road.wayPoints.length < 2) return null;
    return `${from} → ${to}`;
  }, [road]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handleOpen}
      accessibilityRole='button'
      accessibilityLabel={`Open ${road.title} by ${road.author} on the map`}
    >
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {road.author.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {road.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            by {road.author}
          </Text>
        </View>

        {canFavorite ? (
          <Pressable
            onPress={handleToggleFavorite}
            disabled={isSaving}
            hitSlop={10}
            style={({ pressed }) => [
              styles.favoriteButton,
              pressed && styles.favoritePressed,
            ]}
            accessibilityRole='button'
            accessibilityState={{ selected: road.isFavorite, busy: !!isSaving }}
            accessibilityLabel={
              road.isFavorite
                ? `Remove ${road.title} from favourites`
                : `Save ${road.title} to favourites`
            }
          >
            {isSaving ? (
              <ActivityIndicator size='small' color={colors.primary} />
            ) : (
              <Ionicons
                name={road.isFavorite ? 'star' : 'star-outline'}
                size={22}
                color={road.isFavorite ? colors.warning : colors.textSubtle}
              />
            )}
          </Pressable>
        ) : null}
      </View>

      {road.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {road.description}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons name='location-outline' size={12} color={colors.primary} />
          <Text style={styles.metaText}>
            {road.stopCount} stop{road.stopCount === 1 ? '' : 's'}
          </Text>
        </View>
        {route ? (
          <Text style={styles.route} numberOfLines={1}>
            {route}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    cardPressed: { backgroundColor: colors.surfaceAlt },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    favoriteButton: {
      padding: spacing.xs,
      borderRadius: radius.sm,
    },
    favoritePressed: { opacity: 0.6 },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    avatarText: {
      ...typography.label,
      fontWeight: '700',
      color: colors.primary,
    },
    headerText: { flex: 1, gap: spacing.xxs },
    title: {
      ...typography.heading,
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
      gap: spacing.sm,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
    },
    metaText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.primary,
    },
    route: {
      ...typography.caption,
      color: colors.textSubtle,
      flex: 1,
    },
  });

export default memo(DiscoverRoadCard);
