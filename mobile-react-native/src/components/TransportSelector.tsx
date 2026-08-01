import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { transportModes } from 'constants/transportMods';
import { colors, radius, spacing, typography } from 'theme';
import { secondsToHour } from 'utils/secondsToHour';
import { TransportMode, TransportSelectorProps } from 'types/transport-type';

type OptionProps = {
  mode: (typeof transportModes)[number];
  isSelected: boolean;
  durationSeconds?: number;
  onChange: (mode: TransportMode) => void;
};

const TransportOption = memo(
  ({ mode, isSelected, durationSeconds, onChange }: OptionProps) => {
    const handlePress = useCallback(
      () => onChange(mode.key),
      [mode.key, onChange],
    );

    return (
      <Pressable
        style={({ pressed }) => [
          styles.option,
          isSelected && styles.optionSelected,
          pressed && !isSelected && styles.optionPressed,
        ]}
        onPress={handlePress}
        accessibilityRole='radio'
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${mode.label}, ${secondsToHour(durationSeconds)}`}
      >
        <Ionicons
          name={mode.icon}
          size={18}
          color={isSelected ? colors.textInverse : colors.textMuted}
        />
        <Text
          style={[styles.duration, isSelected && styles.textSelected]}
          numberOfLines={1}
        >
          {secondsToHour(durationSeconds)}
        </Text>
        <Text
          style={[styles.label, isSelected && styles.textSelected]}
          numberOfLines={1}
        >
          {mode.label}
        </Text>
      </Pressable>
    );
  },
);

TransportOption.displayName = 'TransportOption';

const TransportSelector = ({
  selected,
  onChange,
  durations,
}: TransportSelectorProps) => (
  <View style={styles.row} accessibilityRole='radiogroup'>
    {transportModes.map((mode) => (
      <TransportOption
        key={mode.key}
        mode={mode}
        isSelected={selected === mode.key}
        durationSeconds={durations?.[mode.key]}
        onChange={onChange}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionPressed: {
    backgroundColor: colors.primarySoft,
  },
  duration: {
    ...typography.label,
    color: colors.text,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  textSelected: {
    color: colors.textInverse,
  },
});

export default memo(TransportSelector);
