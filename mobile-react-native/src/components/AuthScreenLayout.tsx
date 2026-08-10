import React, { ReactNode, memo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText?: string;
  footerActionLabel?: string;
  onFooterAction?: () => void;
}

const AuthScreenLayout = ({
  icon,
  title,
  subtitle,
  children,
  footerText,
  footerActionLabel,
  onFooterAction,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name={icon} size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.form}>{children}</View>

        {footerText && footerActionLabel && onFooterAction ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{footerText}</Text>
            <Pressable
              onPress={onFooterAction}
              hitSlop={10}
              accessibilityRole='button'
              style={({ pressed }) => pressed && styles.footerPressed}
            >
              <Text style={styles.footerLink}>{footerActionLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
      gap: spacing.xxl,
    },
    header: { gap: spacing.sm },
    badge: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.display,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
    },
    form: { gap: spacing.lg },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
    },
    footerText: {
      ...typography.body,
      color: colors.textMuted,
    },
    footerLink: {
      ...typography.body,
      fontWeight: '700',
      color: colors.primary,
    },
    footerPressed: { opacity: 0.6 },
  });

export default memo(AuthScreenLayout);
