import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ContextMenu from 'components/ui/ContextMenu';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { ContextMenuOption } from 'types/components/contextMenu';
import { OwnRoadSummary } from 'types/map-screen-type';

type Props = {
  item: OwnRoadSummary;
  onToggleFavorite: (item: OwnRoadSummary) => void;
  onDelete: (item: OwnRoadSummary) => void;
  onEdit: (item: OwnRoadSummary) => void;
  onView: (roadId: string) => void;
  onTogglePublic: (item: OwnRoadSummary) => void;
  onShare: (item: OwnRoadSummary) => void;
  onOpenInGoogleMaps: (item: OwnRoadSummary) => void;
  isSharing?: boolean;
  isOpeningInMaps?: boolean;
};

const RouteCard = ({
  item,
  onToggleFavorite,
  onDelete,
  onEdit,
  onView,
  onTogglePublic,
  onShare,
  onOpenInGoogleMaps,
  isSharing,
  isOpeningInMaps,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleView = useCallback(() => onView(item.id), [item.id, onView]);

  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const handleToggleFavorite = useCallback(
    () => onToggleFavorite(item),
    [item, onToggleFavorite],
  );

  const handleTogglePublic = useCallback(
    () => onTogglePublic(item),
    [item, onTogglePublic],
  );

  const options = useMemo<ContextMenuOption[]>(
    () => [
      {
        label: 'Continue in Google Maps',
        icon: 'navigate-outline',
        action: () => onOpenInGoogleMaps(item),
      },
      {
        label: 'Share a link',
        icon: 'share-social-outline',
        action: () => onShare(item),
      },
      {
        label: 'Edit details',
        icon: 'create-outline',
        action: () => onEdit(item),
      },
      {
        label: 'Delete route',
        icon: 'trash-outline',
        tone: 'danger',
        action: () => onDelete(item),
      },
    ],
    [item, onDelete, onEdit, onOpenInGoogleMaps, onShare],
  );

  const stopCount = item.stopCount ?? 0;
  const isBusy = !!isSharing || !!isOpeningInMaps;

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

        <Pressable
          onPress={openMenu}
          disabled={isBusy}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole='button'
          accessibilityState={{ busy: isBusy }}
          accessibilityLabel={`Options for route ${item.title}`}
        >
          {/* The share sheet and the handover to Google Maps are both started
              from this menu, so their spinner belongs on the button that
              opened it. */}
          {isBusy ? (
            <ActivityIndicator size='small' color={colors.textSubtle} />
          ) : (
            <Ionicons
              name='ellipsis-vertical'
              size={20}
              color={colors.textSubtle}
            />
          )}
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

        <Ionicons name='chevron-forward' size={18} color={colors.textSubtle} />
      </View>

      <ContextMenu
        visible={isMenuOpen}
        title={item.title}
        options={options}
        onClose={closeMenu}
      />
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
