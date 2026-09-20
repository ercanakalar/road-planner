import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { AuthorHit } from 'types/store/services/searchService-type';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';
import { useTranslation } from 'react-i18next';

interface Props {
  author: AuthorHit;
  onSelect: (author: AuthorHit) => void;
  onOpenProfile: (author: AuthorHit) => void;
}

const AuthorRow = ({ author, onSelect, onOpenProfile }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const handleSelect = useCallback(() => onSelect(author), [author, onSelect]);

  const handleOpenProfile = useCallback(
    () => onOpenProfile(author),
    [author, onOpenProfile],
  );

  const photo = resolvePhotoUrl(author.photo);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handleSelect}
      accessibilityRole='button'
      accessibilityLabel={`Show only routes by ${author.displayName}`}
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
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {author.publicRouteCount} published route
            {author.publicRouteCount === 1 ? '' : 's'}
          </Text>

          {author.isFollowed ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Ionicons
                name='notifications'
                size={11}
                color={colors.primary}
              />
              <Text style={styles.following}>{t('searchScreen.notifyingYou')}</Text>
            </>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={handleOpenProfile}
        hitSlop={10}
        style={({ pressed }) => [styles.open, pressed && styles.openPressed]}
        accessibilityRole='button'
        accessibilityLabel={`Open ${author.displayName}'s profile`}
      >
        <Ionicons name='chevron-forward' size={18} color={colors.textSubtle} />
      </Pressable>
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
      paddingLeft: spacing.lg,
      paddingRight: spacing.sm,
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
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    meta: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
    dot: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSubtle,
    },
    following: {
      ...typography.caption,
      fontSize: 12,
      color: colors.primary,
    },
    open: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    openPressed: { backgroundColor: colors.surfaceAlt },
  });

export default memo(AuthorRow);
