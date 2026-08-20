import React, { ReactNode, memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

const ScreenHeader = ({ title, subtitle, action }: Props) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xs,
    },
    text: { flex: 1, gap: spacing.xxs },
    title: {
      width: '100%',
      textAlign: 'center',
      ...typography.display,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
    },
  });

export default memo(ScreenHeader);
