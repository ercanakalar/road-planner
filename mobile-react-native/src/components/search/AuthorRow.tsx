import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { AuthorHit } from 'types/store/services/searchService-type';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';

interface Props {
  author: AuthorHit;
  onOpen: (author: AuthorHit) => void;
}

/** One person in the results: their name, and how much they have published. */
const AuthorRow = ({ author, onOpen }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleOpen = useCallback(() => onOpen(author), [author, onOpen]);

  const photo = resolvePhotoUrl(author.photo);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handleOpen}
      accessibilityRole='button'
      accessibilityLabel={`See routes by ${author.displayName}`}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>
            {author.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {author.displayName}
        </Text>
        <Text style={styles.meta}>
          {author.publicRouteCount} published route
          {author.publicRouteCount === 1 ? '' : 's'}
        </Text>
      </View>

      <Ionicons name='chevron-forward' size={18} color={colors.textSubtle} />
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    avatarText: {
      ...typography.label,
      color: colors.primary,
    },
    body: { flex: 1, gap: spacing.xxs },
    name: {
      ...typography.label,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    meta: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
  });

export default memo(AuthorRow);
