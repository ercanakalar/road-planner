import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { AppNotification } from 'types/store/services/notificationService-type';
import { resolvePhotoUrl } from 'utils/resolvePhotoUrl';
import { timeAgo } from 'utils/timeAgo';

interface Props {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onOpenActor: (notification: AppNotification) => void;
}

const NotificationRow = ({ notification, onOpen, onOpenActor }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleOpen = useCallback(
    () => onOpen(notification),
    [notification, onOpen],
  );

  const handleOpenActor = useCallback(
    () => onOpenActor(notification),
    [notification, onOpenActor],
  );

  const who = notification.actor?.displayName ?? 'Someone';
  const what = notification.road?.title ?? 'a route';
  const photo = resolvePhotoUrl(notification.actor?.photo);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !notification.isRead && styles.unread,
        pressed && notification.isOpenable && styles.pressed,
      ]}
      onPress={handleOpen}
      disabled={!notification.isOpenable}
      accessibilityRole={notification.isOpenable ? 'button' : undefined}
      accessibilityLabel={`${who} published ${what}, ${timeAgo(
        notification.createdAt,
      )}${notification.isRead ? '' : ', unread'}`}
    >
      <Pressable
        onPress={handleOpenActor}
        disabled={!notification.actor}
        hitSlop={6}
        accessibilityRole={notification.actor ? 'button' : undefined}
        accessibilityLabel={
          notification.actor ? `Open ${who}'s profile` : undefined
        }
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>
              {who.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.body}>
        <Text style={styles.text}>
          <Text style={styles.who}>{who}</Text>
          <Text> published </Text>
          <Text style={styles.what}>{what}</Text>
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{timeAgo(notification.createdAt)}</Text>

          {notification.isOpenable ? null : (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.meta}>no longer available</Text>
            </>
          )}
        </View>
      </View>

      {notification.isRead ? null : <View style={styles.dotMark} />}

      {notification.isOpenable ? (
        <Ionicons name='chevron-forward' size={18} color={colors.textSubtle} />
      ) : null}
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
      paddingRight: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    unread: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    pressed: { opacity: 0.7 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarText: {
      ...typography.label,
      color: colors.primary,
    },
    body: { flex: 1, gap: spacing.xxs },
    text: {
      ...typography.body,
      fontWeight: '400',
      color: colors.text,
    },
    who: { fontWeight: '700' },
    what: { fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
    dotMark: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
  });

export default memo(NotificationRow);
