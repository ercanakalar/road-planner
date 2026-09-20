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
import { useTranslation } from 'react-i18next';

interface Props {
  onPress: () => void;
  placeholder?: string;
}

const SearchBarButton = ({
  onPress,
  placeholder,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
      accessibilityRole='search'
      accessibilityLabel={placeholder ?? t('defaults.searchRoutesAndPeople')}
    >
      <Ionicons name='search' size={19} color={colors.textSubtle} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder ?? t('defaults.searchRoutesAndPeople')}
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
