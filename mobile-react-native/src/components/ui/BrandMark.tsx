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

/** The app's own name, as it appears to a reader rather than to a store. */
export const APP_NAME = 'Travel Routes';

interface Props {
  /** Diameter of the mark. */
  size?: number;
  /** Draws the name beside the mark. */
  showName?: boolean;
  /** One line under the name. Only drawn with `showName`. */
  tagline?: string;
  /**
   * The mark is sitting on a `primary` panel rather than on the page, so it
   * inverts: a `textInverse` disc with a `primary` glyph, and `textInverse`
   * text. Those two are the pair the palette guarantees against each other,
   * so this holds in both schemes without a literal colour.
   */
  onPrimary?: boolean;
}

/**
 * The green disc and the name beside it — the app introducing itself, on the
 * welcome screen and above every auth form.
 *
 * The name is two-tone: the first word takes the text colour and the rest the
 * lighter brand green, which is the same split the launcher icon draws between
 * its route and its destination node.
 */
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
    // The second line is quieter than the name it sits under. On the panel
    // there is no muted ink to reach for, so it borrows the same one at less
    // than full strength.
    taglineOnPrimary: { opacity: 0.85 },
  });

export default memo(BrandMark);
