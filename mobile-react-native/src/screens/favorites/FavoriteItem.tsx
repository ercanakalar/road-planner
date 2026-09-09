import { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ContextMenu from 'components/ui/ContextMenu';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { ContextMenuOption } from 'types/components/contextMenu';
import { FavoriteItemProps } from 'types/screens/mapScreenType';

export const FavoriteItem = memo(
  ({
    item,
    isHighlighted,
    onPress,
    onEdit,
    onRemove,
    onCopyAddress,
  }: FavoriteItemProps) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isRoute = item.kind === 'route';

    const handlePress = useCallback(() => onPress(item), [item, onPress]);
    const openMenu = useCallback(() => setIsMenuOpen(true), []);
    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    const options = useMemo(() => {
      const rows: ContextMenuOption[] = [
        {
          label: isRoute ? 'Open route' : 'Open place',
          icon: isRoute ? 'map-outline' : 'location-outline',
          action: () => onPress(item),
        },
        {
          label: 'Rename',
          icon: 'create-outline',
          action: () => onEdit(item),
        },
      ];

      // Only a place has an address, and only one Google could name.
      if (item.address) {
        rows.push({
          label: 'Copy address',
          icon: 'copy-outline',
          action: () => onCopyAddress(item),
        });
      }

      rows.push({
        label: 'Remove from favourites',
        icon: 'heart-dislike-outline',
        tone: 'danger',
        action: () => onRemove(item),
      });

      return rows;
    }, [isRoute, item, onCopyAddress, onEdit, onPress, onRemove]);

    return (
      <View
        style={[styles.item, isHighlighted && styles.itemHighlighted]}
        accessible={false}
      >
        <Pressable
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
          onPress={handlePress}
          accessibilityRole='button'
          accessibilityLabel={`Open ${item.title}`}
        >
          <View style={[styles.iconContainer, !isRoute && styles.iconStop]}>
            <Ionicons
              name={isRoute ? 'git-branch-outline' : 'location-outline'}
              size={18}
              color={isRoute ? colors.primary : colors.accent}
            />
          </View>

          <View style={styles.itemText}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.itemSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
            {item.isWithdrawn ? (
              <View style={styles.withdrawnRow}>
                <Ionicons
                  name='archive-outline'
                  size={11}
                  color={colors.textSubtle}
                />
                <Text style={styles.withdrawnText}>
                  Removed by its owner · your copy still works
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
          onPress={openMenu}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel={`Options for ${item.title}`}
        >
          <Ionicons
            name='ellipsis-vertical'
            size={20}
            color={colors.textSubtle}
          />
        </Pressable>

        <ContextMenu
          visible={isMenuOpen}
          title={item.title}
          options={options}
          onClose={closeMenu}
        />
      </View>
    );
  },
);

FavoriteItem.displayName = 'FavoriteItem';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingRight: spacing.sm,
    },
    itemHighlighted: {
      backgroundColor: colors.primarySoft,
    },
    // The row and its menu button highlight separately, so a press lands where
    // it looks like it landed.
    main: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingLeft: spacing.lg,
      paddingVertical: spacing.md,
    },
    pressed: {
      backgroundColor: colors.surfaceAlt,
    },
    iconContainer: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconStop: {
      backgroundColor: colors.accentSoft,
    },
    itemText: { flex: 1 },
    itemName: {
      ...typography.body,
      color: colors.text,
    },
    itemSubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    withdrawnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xxs,
    },
    withdrawnText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textSubtle,
      flexShrink: 1,
    },
    menuButton: {
      padding: spacing.sm,
      borderRadius: radius.sm,
    },
  });

export default FavoriteItem;
