import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from 'components/ui/PrimaryButton';
import ThemeModeSelector from 'components/profile/ThemeModeSelector';
import ChangePasswordSection from './ChangePasswordSection';
import useConfirm from 'hooks/feedback/useConfirm';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { SettingKey, settingToggled } from 'store/slices/settingsSlice';
import {
  discardLocalRoutes,
  uploadLocalRoutes,
} from 'store/actions/localRouteActions';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

const PREFERENCES: { key: SettingKey; label: string; hint: string }[] = [
  {
    key: 'notificationsEnabled',
    label: 'Notifications',
    hint: 'Show toast messages for route and favourite changes.',
  },
  {
    key: 'autoFitRoute',
    label: 'Auto-fit route',
    hint: 'Frame the whole route when a map opens.',
  },
];

const SettingsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const dispatch = useAppDispatch();
  const confirm = useConfirm();

  const settings = useAppSelector((state) => state.settings);
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const localRoutes = useAppSelector((state) => state.localRoute.routes);
  const isUploading = useAppSelector((state) => state.localRoute.isUploading);

  const transferable = useMemo(
    () => localRoutes.filter((route) => route.stops.length > 0),
    [localRoutes],
  );

  const stopCount = useMemo(
    () =>
      transferable.reduce((total, route) => total + route.stops.length, 0),
    [transferable],
  );

  const handleToggle = useCallback(
    (key: SettingKey) => () => {
      dispatch(settingToggled(key));
    },
    [dispatch],
  );

  const handleUpload = useCallback(() => {
    dispatch(uploadLocalRoutes());
  }, [dispatch]);

  const handleDiscard = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Discard local routes',
      message: `${transferable.length} route${
        transferable.length === 1 ? '' : 's'
      } will be deleted from this device. This cannot be undone.`,
      confirmLabel: 'Discard',
      icon: 'trash-outline',
      tone: 'danger',
    });
    if (confirmed) dispatch(discardLocalRoutes());
  }, [confirm, dispatch, transferable.length]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.group}>
        <View style={styles.sectionHeader}>
          <Ionicons name='contrast-outline' size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Appearance</Text>
        </View>

        <View style={styles.sectionBody}>
          <ThemeModeSelector />
          <Text style={styles.rowHint}>
            Automatic follows your phone&apos;s light or dark setting.
          </Text>
        </View>
      </View>

      <View style={styles.group}>
        {PREFERENCES.map((preference, index) => (
          <View
            key={preference.key}
            style={[styles.row, index > 0 && styles.rowDivided]}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{preference.label}</Text>
              <Text style={styles.rowHint}>{preference.hint}</Text>
            </View>
            <Switch
              value={settings[preference.key]}
              onValueChange={handleToggle(preference.key)}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.borderStrong}
              accessibilityLabel={preference.label}
            />
          </View>
        ))}
      </View>

      {isLoggedIn ? <ChangePasswordSection /> : null}

      {transferable.length > 0 ? (
        <View style={styles.group}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name='phone-portrait-outline'
              size={18}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Routes on this device</Text>
          </View>

          <View style={styles.sectionBody}>
            <Text style={styles.rowHint}>
              {transferable.length} route
              {transferable.length === 1 ? '' : 's'} with {stopCount} stop
              {stopCount === 1 ? '' : 's'} {isLoggedIn ? 'can be' : 'will be'}{' '}
              saved to your account
              {isLoggedIn ? '.' : ' once you sign in.'}
            </Text>

            <PrimaryButton
              label={isUploading ? 'Saving…' : 'Save to my account'}
              onPress={handleUpload}
              isLoading={isUploading}
              disabled={!isLoggedIn}
            />

            {!isLoggedIn ? (
              <Text style={styles.rowHint}>
                Sign in from the Profile tab to enable this.
              </Text>
            ) : null}

            <PrimaryButton
              label='Discard local routes'
              variant='secondary'
              onPress={handleDiscard}
              disabled={isUploading}
            />
          </View>
        </View>
      ) : null}

      <Text style={styles.footnote}>
        Preferences apply to this device only.
      </Text>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
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
    rowHint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    sectionTitle: {
      ...typography.label,
      fontSize: 15,
      lineHeight: 21,
      color: colors.text,
    },
    sectionBody: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    footnote: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSubtle,
      textAlign: 'center',
    },
  });

export default SettingsScreen;
