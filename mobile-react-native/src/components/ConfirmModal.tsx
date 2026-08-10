import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from './PrimaryButton';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger';
}

interface Props extends ConfirmOptions {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon,
  tone = 'default',
  onConfirm,
  onCancel,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={swallowPress}>
          {icon ? (
            <View
              style={[
                styles.iconCircle,
                tone === 'danger' && styles.iconCircleDanger,
              ]}
            >
              <Ionicons
                name={icon}
                size={24}
                color={tone === 'danger' ? colors.danger : colors.primary}
              />
            </View>
          ) : null}

          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              label={cancelLabel}
              variant='secondary'
              onPress={onCancel}
              style={styles.action}
            />
            <PrimaryButton
              label={confirmLabel}
              tone={tone}
              onPress={onConfirm}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const swallowPress = () => {};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.xl,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      ...shadows.lg,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleDanger: { backgroundColor: colors.dangerSoft },
    title: {
      ...typography.heading,
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
      textAlign: 'center',
    },
    message: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      alignSelf: 'stretch',
      marginTop: spacing.xs,
    },
    action: { flex: 1 },
  });

export default memo(ConfirmModal);
