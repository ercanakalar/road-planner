import { memo, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
} from 'store/services/notificationService';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

const CHANNELS: {
  key: 'inApp' | 'email';
  label: string;
  hint: string;
}[] = [
  {
    key: 'inApp',
    label: 'In the app',
    hint: 'New routes from people you follow appear in Notifications.',
  },
  {
    key: 'email',
    label: 'By email',
    hint: 'And a message to your inbox when they publish one.',
  },
];

/**
 * The two switches for the notifications the server sends.
 *
 * Kept apart from the preferences above them, which are this phone's and live
 * in Redux. These belong to the account: they decide whether anything is
 * written or sent at all, so they follow the person to their next device and
 * have to be read from and written to the API.
 */
const NotificationSettingsSection = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const { data, isLoading, isError } = useGetNotificationSettingsQuery();
  const [updateSettings] = useUpdateNotificationSettingsMutation();

  const handleToggle = useCallback(
    (key: 'inApp' | 'email') => (value: boolean) => {
      updateSettings({ [key]: value });
    },
    [updateSettings],
  );

  return (
    <View style={styles.group}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name='notifications-outline'
          size={18}
          color={colors.primary}
        />
        <Text style={styles.sectionTitle}>Notifications</Text>
      </View>

      {isLoading ? (
        <View style={styles.sectionBody}>
          <ActivityIndicator size='small' color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.sectionBody}>
          <Text style={styles.hint}>
            Your notification settings could not be loaded. They are unchanged.
          </Text>
        </View>
      ) : (
        CHANNELS.map((channel, index) => (
          <View
            key={channel.key}
            style={[styles.row, index > 0 && styles.rowDivided]}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{channel.label}</Text>
              <Text style={styles.hint}>{channel.hint}</Text>
            </View>
            <Switch
              value={data?.[channel.key] ?? true}
              onValueChange={handleToggle(channel.key)}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.borderStrong}
              accessibilityLabel={channel.label}
            />
          </View>
        ))
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    sectionTitle: {
      ...typography.heading,
      color: colors.text,
    },
    sectionBody: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowText: { flex: 1, gap: spacing.xxs },
    rowLabel: {
      ...typography.body,
      color: colors.text,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });

export default memo(NotificationSettingsSection);
