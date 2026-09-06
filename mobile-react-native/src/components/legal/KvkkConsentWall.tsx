import { memo, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import KvkkNotice from './KvkkNotice';
import PrimaryButton from 'components/ui/PrimaryButton';
import ScreenState from 'components/ui/ScreenState';
import useKvkkLanguage from 'hooks/useKvkkLanguage';
import { KVKK_CONSENT_VERSION } from 'constants/kvkk';
import { useAppDispatch } from 'store/hook';
import { kvkkAccepted } from 'store/slices/kvkkSlice';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

/**
 * The screen that stands in front of the app until the notice is accepted.
 * `isUpdate` marks the case where a consent exists but names an older text.
 */
const KvkkConsentWall = ({ isUpdate }: { isUpdate: boolean }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const dispatch = useAppDispatch();
  const { language, copy, setLanguage } = useKvkkLanguage();
  const [hasDeclined, setHasDeclined] = useState(false);

  const handleAccept = useCallback(() => {
    dispatch(
      kvkkAccepted({
        version: KVKK_CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
        language,
      }),
    );
  }, [dispatch, language]);

  const handleDecline = useCallback(() => setHasDeclined(true), []);
  const handleReopen = useCallback(() => setHasDeclined(false), []);

  if (hasDeclined) {
    return (
      <SafeAreaView style={styles.flex}>
        <ScreenState
          variant='empty'
          icon='lock-closed-outline'
          title={copy.declinedTitle}
          message={copy.declinedBody}
          actionLabel={copy.declinedBackLabel}
          onAction={handleReopen}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isUpdate ? (
          <View style={styles.banner}>
            <Ionicons name='refresh-outline' size={18} color={colors.primary} />
            <Text style={styles.bannerText}>{copy.updatedNotice}</Text>
          </View>
        ) : null}

        <KvkkNotice
          copy={copy}
          language={language}
          onLanguageChange={setLanguage}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.statement}>{copy.consentStatement}</Text>
        <PrimaryButton label={copy.acceptLabel} onPress={handleAccept} />
        <PrimaryButton
          label={copy.declineLabel}
          variant='secondary'
          onPress={handleDecline}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
    },
    bannerText: {
      ...typography.caption,
      flex: 1,
      color: colors.primaryDark,
      lineHeight: 18,
    },
    footer: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      ...shadows.lg,
    },
    statement: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: spacing.xxs,
    },
  });

export default memo(KvkkConsentWall);
