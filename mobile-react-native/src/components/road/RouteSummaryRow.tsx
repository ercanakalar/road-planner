import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { WaypointWithAddress } from 'types/map-screen-type';
import { addressLocality, addressName } from 'utils/address';

/**
 * The little a row needs to know about a route, so the same row can show a
 * Discover pick and a search hit without either screen owning a card.
 */
export interface RouteSummary {
  id: string;
  title: string;
  author: string;
  /** Present when the route came from a surface that can open its author. */
  authorId?: string;
  stopCount: number;
  isFavorite: boolean;
  wayPoints: WaypointWithAddress[];
}

interface Props {
  route: RouteSummary;
  canFavorite?: boolean;
  isSaving?: boolean;
  onOpen: (routeId: string) => void;
  onToggleFavorite: (routeId: string) => void;
  /** Opens the author, when the surface has somewhere to open them. */
  onOpenAuthor?: (route: RouteSummary) => void;
}

const placeOf = (waypoints: WaypointWithAddress[], index: number) => {
  const waypoint = waypoints[index];
  return (
    addressLocality(waypoint?.address) || addressName(waypoint?.address) || null
  );
};

/**
 * One route, in one row.
 *
 * Deliberately smaller than a card: with search above it, what a list has to do
 * is let someone skim past the ones they did not mean, and a title, a name and
 * the two ends of the route are what that takes.
 */
const RouteSummaryRow = ({
  route,
  canFavorite = true,
  isSaving,
  onOpen,
  onToggleFavorite,
  onOpenAuthor,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleOpen = useCallback(() => onOpen(route.id), [onOpen, route.id]);

  const handleToggleFavorite = useCallback(
    () => onToggleFavorite(route.id),
    [onToggleFavorite, route.id],
  );

  const handleOpenAuthor = useCallback(
    () => onOpenAuthor?.(route),
    [onOpenAuthor, route],
  );

  const leg = useMemo(() => {
    const from = placeOf(route.wayPoints, 0);
    const to = placeOf(route.wayPoints, route.wayPoints.length - 1);
    if (!from || !to || route.wayPoints.length < 2) return null;
    return `${from} → ${to}`;
  }, [route.wayPoints]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handleOpen}
      accessibilityRole='button'
      accessibilityLabel={`Open ${route.title} by ${route.author}`}
    >
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {route.title}
        </Text>

        <View style={styles.metaRow}>
          <Pressable
            onPress={onOpenAuthor ? handleOpenAuthor : handleOpen}
            hitSlop={6}
            disabled={!onOpenAuthor}
            accessibilityRole={onOpenAuthor ? 'button' : undefined}
            accessibilityLabel={
              onOpenAuthor ? `See routes by ${route.author}` : undefined
            }
          >
            <Text
              style={[styles.author, onOpenAuthor && styles.authorLink]}
              numberOfLines={1}
            >
              {route.author}
            </Text>
          </Pressable>

          <Text style={styles.dot}>·</Text>

          <Text style={styles.meta}>
            {route.stopCount} stop{route.stopCount === 1 ? '' : 's'}
          </Text>

          {leg ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {leg}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {canFavorite ? (
        <Pressable
          onPress={handleToggleFavorite}
          disabled={isSaving}
          hitSlop={10}
          style={({ pressed }) => [styles.star, pressed && styles.starPressed]}
          accessibilityRole='button'
          accessibilityState={{ selected: route.isFavorite, busy: !!isSaving }}
          accessibilityLabel={
            route.isFavorite
              ? `Remove ${route.title} from favourites`
              : `Save ${route.title} to favourites`
          }
        >
          <Ionicons
            name={route.isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={route.isFavorite ? colors.warning : colors.textSubtle}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    body: { flex: 1, gap: spacing.xxs },
    title: {
      ...typography.label,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    author: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
      maxWidth: 120,
    },
    authorLink: { color: colors.primary },
    dot: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSubtle,
    },
    meta: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
      flexShrink: 1,
    },
    star: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    starPressed: { backgroundColor: colors.surfaceAlt },
  });

export default memo(RouteSummaryRow);
