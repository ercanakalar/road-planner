import { ReactNode, memo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BrandMark from 'components/ui/BrandMark';
import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText?: string;
  footerActionLabel?: string;
  onFooterAction?: () => void;
}

const AuthScreenLayout = ({
  title,
  subtitle,
  children,
  footerText,
  footerActionLabel,
  onFooterAction,
}: Props) => {
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
          <BrandMark size={56} />
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
