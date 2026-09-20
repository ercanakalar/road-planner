import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';

export interface Segment<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

const SegmentedControl = <T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={styles.track}
      accessibilityRole='tablist'
      accessibilityLabel={accessibilityLabel}
    >
      {segments.map((segment) => {
        const isSelected = segment.value === value;

        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && !isSelected && styles.segmentPressed,
            ]}
            accessibilityRole='tab'
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
              numberOfLines={1}
            >
              {segment.label}
              {segment.count === undefined ? '' : `  ${segment.count}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: spacing.xs,
      gap: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
    },
    segmentSelected: { backgroundColor: colors.surface },
    segmentPressed: { opacity: 0.6 },
    label: {
      ...typography.label,
      color: colors.textMuted,
    },
    labelSelected: { color: colors.primary },
  });

export default memo(SegmentedControl) as typeof SegmentedControl;
