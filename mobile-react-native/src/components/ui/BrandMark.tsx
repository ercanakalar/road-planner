import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

export const APP_NAME = 'Travel Routes';

interface Props {
  size?: number;
  showName?: boolean;
  tagline?: string;
  onPrimary?: boolean;
}

const BrandMark = ({
  size = 64,
  showName = false,
  tagline,
  onPrimary = false,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [first, ...rest] = APP_NAME.split(' ');

  return (
    <View style={showName ? styles.row : undefined}>
      <View
        style={[
          styles.mark,
          onPrimary && styles.markOnPrimary,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Ionicons
          name='navigate'
          size={Math.round(size * 0.48)}
          color={onPrimary ? colors.primary : colors.textInverse}
        />
      </View>

      {showName ? (
        <View style={styles.words}>
          <Text
            style={[styles.name, onPrimary && styles.inverted]}
            numberOfLines={1}
          >
            {first}
            {rest.length ? (
              <Text style={[styles.nameAccent, onPrimary && styles.inverted]}>
                {` ${rest.join(' ')}`}
              </Text>
            ) : null}
          </Text>
          {tagline ? (
            <Text
              style={[
                styles.tagline,
                onPrimary && styles.inverted,
                onPrimary && styles.taglineOnPrimary,
              ]}
              numberOfLines={2}
            >
              {tagline}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    mark: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      ...shadows.sm,
    },
    markOnPrimary: { backgroundColor: colors.textInverse },
    words: { flex: 1, gap: spacing.xxs },
    name: {
      ...typography.title,
      color: colors.text,
    },
    nameAccent: { color: colors.brand },
    inverted: { color: colors.textInverse },
    tagline: {
      ...typography.caption,
      color: colors.textMuted,
    },
    taglineOnPrimary: { opacity: 0.85 },
  });

export default memo(BrandMark);
