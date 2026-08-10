import React, { memo, useCallback } from 'react';
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
import { WaypointWithAddressAndId } from 'types/map-screen-type';

type Props = {
  item: WaypointWithAddressAndId;
  onToggleFavorite: (item: WaypointWithAddressAndId) => void;
  onDelete: (item: WaypointWithAddressAndId) => void;
  onEdit: (item: WaypointWithAddressAndId) => void;
  onView: (roadId: string) => void;
  onTogglePublic: (item: WaypointWithAddressAndId) => void;
  onShare: (item: WaypointWithAddressAndId) => void;
  isSharing?: boolean;
};

const RouteCard = ({
  item,
  onToggleFavorite,
  onDelete,
  onEdit,
  onView,
  onTogglePublic,
  onShare,
  isSharing,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleView = useCallback(() => onView(item.id), [item.id, onView]);

  const handleToggleFavorite = useCallback(
    () => onToggleFavorite(item),
    [item, onToggleFavorite],
  );

  const handleDelete = useCallback(() => onDelete(item), [item, onDelete]);

  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);

  const handleTogglePublic = useCallback(
    () => onTogglePublic(item),
    [item, onTogglePublic],
  );

  const handleShare = useCallback(() => onShare(item), [item, onShare]);

  const stopCount = item.wayPoints?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handleView}
      accessibilityRole='button'
      accessibilityLabel={`Open route ${item.title}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Pressable
          onPress={handleToggleFavorite}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole='button'
          accessibilityLabel={
            item.isFavorite ? 'Remove from favourites' : 'Add to favourites'
          }
        >
          <Ionicons
            name={item.isFavorite ? 'star' : 'star-outline'}
            size={22}
            color={item.isFavorite ? colors.warning : colors.textSubtle}
          />
        </Pressable>
      </View>

      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Ionicons
              name='location-outline'
              size={13}
              color={colors.primary}
            />
            <Text style={styles.metaText}>
              {stopCount} stop{stopCount === 1 ? '' : 's'}
            </Text>
          </View>

          <Pressable
            onPress={handleTogglePublic}
            hitSlop={8}
            style={({ pressed }) => [
              styles.sharePill,
              item.isPublic && styles.sharePillOn,
              pressed && styles.pressed,
            ]}
            accessibilityRole='switch'
            accessibilityState={{ checked: !!item.isPublic }}
            accessibilityLabel={
              item.isPublic
                ? `Stop sharing route ${item.title}`
                : `Share route ${item.title} with everyone`
            }
          >
            <Ionicons
              name={item.isPublic ? 'globe-outline' : 'lock-closed-outline'}
              size={13}
              color={item.isPublic ? colors.success : colors.textSubtle}
            />
            <Text
              style={[styles.shareText, item.isPublic && styles.shareTextOn]}
            >
              {item.isPublic ? 'Public' : 'Private'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footerActions}>
          <Pressable
            onPress={handleShare}
            disabled={isSharing}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole='button'
            accessibilityState={{ busy: !!isSharing }}
            accessibilityLabel={`Send a link to route ${item.title}`}
          >
            {isSharing ? (
              <ActivityIndicator size='small' color={colors.textSubtle} />
            ) : (
              <Ionicons
                name='share-social-outline'
                size={18}
                color={colors.textSubtle}
              />
            )}
          </Pressable>

          <Pressable
            onPress={handleEdit}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole='button'
            accessibilityLabel={`Edit route ${item.title}`}
          >
            <Ionicons
              name='create-outline'
              size={18}
              color={colors.textSubtle}
            />
          </Pressable>

          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole='button'
            accessibilityLabel={`Delete route ${item.title}`}
          >
            <Ionicons
              name='trash-outline'
              size={18}
              color={colors.textSubtle}
            />
          </Pressable>
          <Ionicons
            name='chevron-forward'
            size={18}
            color={colors.textSubtle}
          />
        </View>
      </View>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      ...shadows.sm,
    },
    cardPressed: {
      backgroundColor: colors.surfaceAlt,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      ...typography.heading,
      color: colors.text,
      flex: 1,
    },
    description: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    footerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 1,
    },
    sharePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    sharePillOn: {
      borderColor: colors.success,
      backgroundColor: colors.successSoft,
    },
    shareText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSubtle,
    },
    shareTextOn: { color: colors.success },
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
    iconButton: {
      padding: spacing.xs,
      borderRadius: radius.sm,
    },
    pressed: {
      backgroundColor: colors.surfaceAlt,
    },
  });

export default memo(RouteCard);
