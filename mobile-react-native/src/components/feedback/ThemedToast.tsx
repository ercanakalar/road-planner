import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Toast, {
  BaseToast,
  BaseToastProps,
  ToastConfig,
} from 'react-native-toast-message';

import { radius, shadows, spacing, typography, useTheme } from 'theme';
import type { ThemeColors } from 'theme';

const createToastStyles = (colors: ThemeColors, accent: string) =>
  StyleSheet.create({
    toast: {
      borderLeftColor: accent,
      borderLeftWidth: 5,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      ...shadows.md,
    },
    content: {
      paddingHorizontal: spacing.lg,
    },
    text1: {
      ...typography.label,
      fontSize: 14,
      lineHeight: 19,
      color: colors.text,
    },
    text2: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });

const ThemedToast = () => {
  const { colors } = useTheme();

  const config = useMemo<ToastConfig>(() => {
    const build = (accent: string) => {
      const styles = createToastStyles(colors, accent);
      return (props: BaseToastProps) => (
        <BaseToast
          {...props}
          style={styles.toast}
          contentContainerStyle={styles.content}
          text1Style={styles.text1}
          text2Style={styles.text2}
        />
      );
    };

    return {
      success: build(colors.success),
      error: build(colors.danger),
      info: build(colors.primary),
    };
  }, [colors]);

  return <Toast config={config} />;
};

export default ThemedToast;
