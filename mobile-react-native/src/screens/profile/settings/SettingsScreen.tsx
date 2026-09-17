import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import PrimaryButton from 'components/ui/PrimaryButton';
import LanguageSelector from 'components/profile/LanguageSelector';
import ThemeModeSelector from 'components/profile/ThemeModeSelector';
import NotificationSettingsSection from 'components/profile/NotificationSettingsSection';
import ChangePasswordSection from './ChangePasswordSection';
import useAppLanguage from 'hooks/common/useAppLanguage';
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
    label: 'settings.inAppMessages',
    hint: 'settings.inAppMessagesHint',
  },
  {
    key: 'autoFitRoute',
    label: 'settings.autoFitRoute',
    hint: 'settings.autoFitRouteHint',
  },
];

const SettingsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { isChosen } = useAppLanguage();

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
      title: t('settings.discardTitle'),
      message: t('settings.discardMessage', { count: transferable.length }),
      confirmLabel: t('settings.discardConfirm'),
      icon: 'trash-outline',
      tone: 'danger',
    });
    if (confirmed) dispatch(discardLocalRoutes());
  }, [confirm, dispatch, t, transferable.length]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.group}>
        <View style={styles.sectionHeader}>
          <Ionicons name='contrast-outline' size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
        </View>

        <View style={styles.sectionBody}>
          <ThemeModeSelector />
          <Text style={styles.rowHint}>
            {t('settings.automaticFollowsPhone')}
          </Text>
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.sectionHeader}>
          <Ionicons name='language-outline' size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        </View>

        <View style={styles.sectionBody}>
          <LanguageSelector />
          <Text style={styles.rowHint}>
            {isChosen
              ? t('settings.languageHint')
              : `${t('settings.languageFollowsPhone')} · ${t('settings.languageHint')}`}
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
              <Text style={styles.rowLabel}>{t(preference.label)}</Text>
              <Text style={styles.rowHint}>{t(preference.hint)}</Text>
            </View>
            <Switch
              value={settings[preference.key]}
              onValueChange={handleToggle(preference.key)}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.borderStrong}
              accessibilityLabel={t(preference.label)}
            />
          </View>
        ))}
      </View>

      {/*
        Only for somebody signed in: these are the account's, not the phone's,
        and there is nobody to save them against otherwise.
      */}
      {isLoggedIn ? <NotificationSettingsSection /> : null}

      {isLoggedIn ? <ChangePasswordSection /> : null}

      {transferable.length > 0 ? (
        <View style={styles.group}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name='phone-portrait-outline'
              size={18}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>
              {t('settings.routesOnThisDevice')}
            </Text>
          </View>

          <View style={styles.sectionBody}>
            <Text style={styles.rowHint}>
              {t(isLoggedIn ? 'settings.routesReady' : 'settings.routesPending', {
                count: transferable.length,
                stops: t('settings.stopCount', { count: stopCount }),
              })}
            </Text>

            <PrimaryButton
              label={
                isUploading ? t('settings.saving') : t('settings.saveToMyAccount')
              }
              onPress={handleUpload}
              isLoading={isUploading}
              disabled={!isLoggedIn}
            />

            {!isLoggedIn ? (
              <Text style={styles.rowHint}>
                {t('settings.signInToEnable')}
              </Text>
            ) : null}

            <PrimaryButton
              label={t('settings.discardLocalRoutes')}
              variant='secondary'
              onPress={handleDiscard}
              disabled={isUploading}
            />
          </View>
        </View>
      ) : null}

      <Text style={styles.footnote}>
        {t('settings.preferencesApplyToDevice')}
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
