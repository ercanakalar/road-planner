import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  title: string;
  subtitle?: string;
}

const ScreenHeader = ({ title, subtitle }: Props) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      gap: spacing.xxs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    // Title and subtitle share an edge. Centring one and not the other read as
    // a mistake, and a centred display title fights the left-aligned list
    // under it.
    title: {
      ...typography.display,
      color: colors.text,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
    },
  });

export default memo(ScreenHeader);
