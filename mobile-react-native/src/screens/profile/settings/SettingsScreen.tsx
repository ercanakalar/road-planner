import React, { useCallback, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from 'components/PrimaryButton';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { SettingKey, settingToggled } from 'store/slices/settingsSlice';
import {
  discardLocalRoads,
  uploadLocalRoads,
} from 'store/actions/localRoadActions';

import { colors, radius, shadows, spacing, typography } from 'theme';

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
  const dispatch = useAppDispatch();

  const settings = useAppSelector((state) => state.settings);
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const localRoads = useAppSelector((state) => state.localRoad.roads);
  const isUploading = useAppSelector((state) => state.localRoad.isUploading);

  const transferable = useMemo(
    () => localRoads.filter((road) => road.wayPoints.length > 0),
    [localRoads],
  );

  const stopCount = useMemo(
    () => transferable.reduce((total, road) => total + road.wayPoints.length, 0),
    [transferable],
  );

  const handleToggle = useCallback(
    (key: SettingKey) => () => {
      dispatch(settingToggled(key));
    },
    [dispatch],
  );

  const handleUpload = useCallback(() => {
    dispatch(uploadLocalRoads());
  }, [dispatch]);

  const handleDiscard = useCallback(() => {
    Alert.alert(
      'Discard local routes',
      `${transferable.length} route${
        transferable.length === 1 ? '' : 's'
      } will be deleted from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => dispatch(discardLocalRoads()),
        },
      ],
    );
  }, [dispatch, transferable.length]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.group}>
        {PREFERENCES.map((preference) => (
          <View key={preference.key} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{preference.label}</Text>
              <Text style={styles.rowHint}>{preference.hint}</Text>
            </View>
            <Switch
              value={settings[preference.key]}
              onValueChange={handleToggle(preference.key)}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              accessibilityLabel={preference.label}
            />
          </View>
        ))}
      </View>

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

const styles = StyleSheet.create({
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: { flex: 1, gap: 2 },
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
