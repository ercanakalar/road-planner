import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import KvkkNotice from 'components/legal/KvkkNotice';
import PrimaryButton from 'components/ui/PrimaryButton';
import { useConfirm } from 'components/feedback/ConfirmProvider';
import useKvkkLanguage from 'hooks/useKvkkLanguage';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { useLogoutMutation } from 'store/services/authenticationService';
import { logout } from 'store/slices/authSlice';
import { kvkkWithdrawn, selectKvkkConsent } from 'store/slices/kvkkSlice';
import { formatConsentDate } from 'utils/formatConsentDate';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

const KvkkScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { language, copy, setLanguage } = useKvkkLanguage();

  const consent = useAppSelector(selectKvkkConsent);
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const [logoutTrigger, { isLoading: isSigningOut }] = useLogoutMutation();

  const handleWithdraw = useCallback(async () => {
    const confirmed = await confirm({
      title: copy.withdrawTitle,
      message: copy.withdrawMessage,
      confirmLabel: copy.withdrawConfirmLabel,
      cancelLabel: copy.withdrawCancelLabel,
      icon: 'shield-outline',
      tone: 'danger',
    });
    if (!confirmed) return;

    // Consent is what the account session rests on, so the session goes with
    // it. Routes held on the device are the reader's own and stay put.
    if (isLoggedIn) {
      try {
        await logoutTrigger().unwrap();
      } catch {}
      dispatch(logout());
    }

    dispatch(kvkkWithdrawn());
  }, [confirm, copy, dispatch, isLoggedIn, logoutTrigger]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {consent ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name='shield-checkmark'
              size={20}
              color={colors.success}
            />
            <Text style={styles.cardTitle}>{copy.statusTitle}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{copy.acceptedOnLabel}</Text>
            <Text style={styles.metaValue}>
              {formatConsentDate(consent.acceptedAt, language)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{copy.versionLabel}</Text>
            <Text style={styles.metaValue}>{consent.version}</Text>
          </View>
        </View>
      ) : null}

      <KvkkNotice
        copy={copy}
        language={language}
        onLanguageChange={setLanguage}
      />

      <PrimaryButton
        label={copy.withdrawLabel}
        tone='danger'
        onPress={handleWithdraw}
        isLoading={isSigningOut}
      />
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: {
      ...typography.heading,
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    metaLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    metaValue: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.text,
    },
  });

export default KvkkScreen;
