import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
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

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  isBusy?: boolean;
  autoFocus?: boolean;
}

const SearchField = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search routes and people',
  isBusy,
  autoFocus,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inputTheme = useThemedTextInputProps();

  const handleClear = useCallback(() => onClear(), [onClear]);

  return (
    <View style={styles.container}>
      <Ionicons name='search' size={18} color={colors.textSubtle} />

      <TextInput
        {...inputTheme}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize='none'
        autoFocus={autoFocus}
        returnKeyType='search'
        accessibilityLabel={placeholder}
      />

      {isBusy ? (
        <ActivityIndicator size='small' color={colors.textSubtle} />
      ) : null}

      {value ? (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          accessibilityRole='button'
          accessibilityLabel='Clear search'
        >
          <Ionicons name='close-circle' size={18} color={colors.textSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.md,
      height: 44,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.text,
      paddingVertical: 0,
    },
  });

export default memo(SearchField);
