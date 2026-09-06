import { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
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
}

const FavoritesSearch = ({ value, onChange }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const inputTheme = useThemedTextInputProps();

  return (
    <View style={styles.container}>
      <Ionicons name='search' size={18} color={colors.textSubtle} />

      <TextInput
        {...inputTheme}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder='Search favourites'
        autoCorrect={false}
        autoCapitalize='none'
        returnKeyType='search'
        accessibilityLabel='Search favourites'
      />

      {value ? (
        <Pressable
          onPress={() => onChange('')}
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
      marginBottom: spacing.md,
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

export default memo(FavoritesSearch);
