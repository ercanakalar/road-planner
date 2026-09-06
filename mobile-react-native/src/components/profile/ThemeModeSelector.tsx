import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppDispatch, useAppSelector } from 'store/hook';
import { themeModeSet } from 'store/slices/settingsSlice';
import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { ThemeMode } from 'types/theme';

const OPTIONS: {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'Automatic', icon: 'phone-portrait-outline' },
];

const ThemeModeOption = memo(
  ({
    option,
    isSelected,
    onSelect,
  }: {
    option: (typeof OPTIONS)[number];
    isSelected: boolean;
    onSelect: (mode: ThemeMode) => void;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const handlePress = useCallback(
      () => onSelect(option.mode),
      [onSelect, option.mode],
    );

    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole='radio'
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={option.label}
        style={({ pressed }) => [
          styles.option,
          isSelected && styles.optionSelected,
          pressed && styles.optionPressed,
        ]}
      >
        <Ionicons
          name={option.icon}
          size={18}
          color={isSelected ? colors.primary : colors.textMuted}
        />
        <Text
          style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  },
);

ThemeModeOption.displayName = 'ThemeModeOption';

const ThemeModeSelector = () => {
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(createStyles);
  const mode = useAppSelector((state) => state.settings.themeMode);

  const handleSelect = useCallback(
    (next: ThemeMode) => {
      dispatch(themeModeSet(next));
    },
    [dispatch],
  );

  return (
    <View style={styles.row} accessibilityRole='radiogroup'>
      {OPTIONS.map((option) => (
        <ThemeModeOption
          key={option.mode}
          option={option}
          isSelected={mode === option.mode}
          onSelect={handleSelect}
        />
      ))}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionPressed: { opacity: 0.85 },
    optionLabel: {
      ...typography.label,
      color: colors.textMuted,
    },
    optionLabelSelected: { color: colors.primary },
  });

export default memo(ThemeModeSelector);
