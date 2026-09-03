import React, { memo, useCallback } from 'react';
import { Modal, Text, Pressable, StyleSheet } from 'react-native';
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
import {
  ContextMenuOption,
  ContextMenuProps,
} from 'types/components/contextMenu';

const MenuRow = memo(
  ({ option, onClose }: { option: ContextMenuOption; onClose: () => void }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const isDanger = option.tone === 'danger';

    const handlePress = useCallback(() => {
      onClose();
      // The sheet is a native modal, and a row may open another one — a
      // confirmation, say. Starting that in the same frame as this one closes
      // loses it on Android, so let the close land first.
      requestAnimationFrame(option.action);
    }, [onClose, option]);

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={handlePress}
        accessibilityRole='button'
        accessibilityLabel={option.label}
      >
        {option.icon ? (
          <Ionicons
            name={option.icon}
            size={20}
            color={isDanger ? colors.danger : colors.primary}
          />
        ) : null}
        <Text style={[styles.rowText, isDanger && styles.rowTextDanger]}>
          {option.label}
        </Text>
      </Pressable>
    );
  },
);

MenuRow.displayName = 'MenuRow';

const swallowPress = () => {};

const ContextMenu = ({
  visible,
  title,
  options,
  onClose,
}: ContextMenuProps) => {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      animationType='fade'
      onRequestClose={onClose}
      transparent
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={swallowPress}>
          {title ? (
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          ) : null}

          {options.map((option) => (
            <MenuRow key={option.label} option={option} onClose={onClose} />
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.row,
              styles.cancelRow,
              pressed && styles.rowPressed,
            ]}
            onPress={onClose}
            accessibilityRole='button'
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
      padding: spacing.lg,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.xs,
      overflow: 'hidden',
      ...shadows.lg,
    },
    title: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceAlt,
    },
    rowText: {
      ...typography.body,
      color: colors.text,
    },
    rowTextDanger: {
      color: colors.danger,
    },
    cancelRow: {
      justifyContent: 'center',
    },
    cancelText: {
      ...typography.body,
      color: colors.textMuted,
    },
  });

export default memo(ContextMenu);
