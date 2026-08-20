import React, { memo, useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  useThemedTextInputProps,
} from 'theme';
import type { ThemeColors } from 'theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  isPassword?: boolean;
}

const FormField = ({ label, error, isPassword, ...inputProps }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inputTheme = useThemedTextInputProps();

  const isMultiline = !!inputProps.multiline;
  const [isFocused, setIsFocused] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  const toggleHidden = useCallback(
    () => setIsHidden((previous) => !previous),
    [],
  );

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          isMultiline && styles.inputWrapperMultiline,
          isFocused && styles.inputWrapperFocused,
          !!error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          {...inputProps}
          style={[styles.input, isMultiline && styles.inputMultiline]}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword && isHidden}
          {...inputTheme}
          accessibilityLabel={label}
        />

        {isPassword ? (
          <Pressable
            onPress={toggleHidden}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={isHidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={isHidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSubtle}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: { gap: spacing.sm },
    label: {
      ...typography.label,
      color: colors.text,
      marginLeft: spacing.xxs,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surfaceAlt,
      height: 54,
    },
    inputWrapperMultiline: {
      height: undefined,
      minHeight: 104,
      paddingVertical: spacing.md,
      alignItems: 'flex-start',
    },
    inputWrapperFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    inputWrapperError: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft,
    },
    input: {
      flex: 1,
      ...typography.body,
      lineHeight: undefined,
      color: colors.text,
      paddingVertical: 0,
    },
    inputMultiline: {
      minHeight: 76,
      lineHeight: 22,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginLeft: spacing.xxs,
    },
  });

export default memo(FormField);
