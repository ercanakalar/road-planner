import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import KvkkNotice from 'components/legal/KvkkNotice';
import PrimaryButton from 'components/ui/PrimaryButton';
import { KVKK_CONSENT_VERSION } from 'constants/kvkk';
import useConfirm from 'hooks/feedback/useConfirm';
import useKvkkLanguage from 'hooks/legal/useKvkkLanguage';
import { showNotification } from 'services/notificationService';
import { discardPendingUsage } from 'services/usageReporter';
import { apiErrorMessage } from 'store/bases/apiErrorMessage';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { useWithdrawConsentMutation } from 'store/services/consentService';
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
  const [withdrawConsent, { isLoading: isWithdrawing }] =
    useWithdrawConsentMutation();

  const handleWithdraw = useCallback(async () => {
    const confirmed = await confirm({
      title: copy.withdrawTitle,
      message: isLoggedIn ? copy.withdrawDeleteMessage : copy.withdrawMessage,
      confirmLabel: isLoggedIn
        ? copy.withdrawDeleteConfirmLabel
        : copy.withdrawConfirmLabel,
      cancelLabel: copy.withdrawCancelLabel,
      icon: isLoggedIn ? 'trash-outline' : 'shield-outline',
      tone: 'danger',
    });
    if (!confirmed) return;

    if (isLoggedIn) {
      // The account is erased on the server before anything changes here. If
      // that fails, the person stays signed in with their consent in place —
      // never told their data is gone while it is still there.
      try {
        await withdrawConsent({
          version: consent?.version ?? KVKK_CONSENT_VERSION,
          language,
        }).unwrap();
      } catch (error) {
        showNotification({
          type: 'error',
          header: copy.withdrawFailedTitle,
          message: apiErrorMessage(error, copy.withdrawFailedMessage),
        });
        return;
      }

      // Signing out locally only: the deletion already ended every session.
      dispatch(logout());
    }

    discardPendingUsage();
    dispatch(kvkkWithdrawn());
  }, [confirm, consent, copy, dispatch, isLoggedIn, language, withdrawConsent]);

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
        isLoading={isWithdrawing}
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
