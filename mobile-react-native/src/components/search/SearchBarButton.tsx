import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

interface Props {
  onPress: () => void;
  placeholder?: string;
}

/**
 * Looks like the search field it opens, and behaves like a button.
 *
 * A real field here would have to own a query, a keyboard and a results list on
 * a screen that is mostly about something else. Wearing the field's clothes and
 * handing the tap straight to the search screen — where the field is focused on
 * arrival — costs one frame and keeps this screen simple.
 */
const SearchBarButton = ({
  onPress,
  placeholder = 'Search routes and people',
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
      accessibilityRole='search'
      accessibilityLabel={placeholder}
    >
      <Ionicons name='search' size={19} color={colors.textSubtle} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      height: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.sm,
    },
    barPressed: { backgroundColor: colors.surfaceAlt },
    placeholder: {
      ...typography.body,
      color: colors.textSubtle,
      flex: 1,
    },
  });

export default memo(SearchBarButton);
