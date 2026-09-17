import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import FormField from 'components/ui/FormField';
import PrimaryButton from 'components/ui/PrimaryButton';
import { useChangePasswordMutation } from 'store/services/authenticationService';
import { showNotification } from 'services/notificationService';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { useTranslation } from 'react-i18next';

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

const ChangePasswordSection = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleChange = useCallback(
    (field: keyof typeof EMPTY) => (value: string) => {
      setForm((previous) => ({ ...previous, [field]: value }));
      setError('');
    },
    [],
  );

  const validationError = useMemo(() => {
    if (!form.currentPassword) return t('forms.enterCurrentPassword');
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!PASSWORD_PATTERN.test(form.newPassword)) {
      return t('forms.passwordNeedsLetterAndNumber');
    }
    if (form.newPassword === form.currentPassword) {
      return t('forms.passwordReused');
    }
    if (form.newPassword !== form.confirmPassword) {
      return t('forms.passwordsDoNotMatch');
    }
    return '';
  }, [form]);

  const toggle = useCallback(() => {
    setIsOpen((previous) => !previous);
    setForm(EMPTY);
    setError('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await changePassword(form).unwrap();
      setForm(EMPTY);
      setIsOpen(false);
    } catch (caught) {
      const status = (caught as { status?: number } | undefined)?.status;
      setError(
        status === 401
          ? t('forms.wrongCurrentPassword')
          : t('forms.couldNotChangePassword'),
      );
      showNotification({
        type: 'error',
        header: t('toast.passwordNotChanged'),
        message: t('toast.passwordCheckCurrent'),
      });
    }
  }, [changePassword, form, validationError]);

  return (
    <View style={styles.group}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
        onPress={toggle}
        accessibilityRole='button'
        accessibilityState={{ expanded: isOpen }}
      >
        <Ionicons name='key-outline' size={18} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('resetPassword.changeTitle')}</Text>
          <Text style={styles.hint}>{t('resetPassword.changeHint')}</Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSubtle}
        />
      </Pressable>

      {isOpen ? (
        <View style={styles.body}>
          <FormField
            label={t('fields.currentPassword')}
            placeholder={t('fields.currentPasswordPlaceholder')}
            value={form.currentPassword}
            onChangeText={handleChange('currentPassword')}
            autoComplete='current-password'
            isPassword
          />

          <FormField
            label={t('fields.newPassword')}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={form.newPassword}
            onChangeText={handleChange('newPassword')}
            autoComplete='new-password'
            isPassword
          />

          <FormField
            label={t('fields.confirmNewPassword')}
            placeholder={t('fields.repeatNewPassword')}
            value={form.confirmPassword}
            onChangeText={handleChange('confirmPassword')}
            autoComplete='new-password'
            isPassword
            error={error}
          />

          <PrimaryButton
            label={t('actions.updatePassword')}
            onPress={handleSubmit}
            isLoading={isLoading}
          />
        </View>
      ) : null}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    headerPressed: { backgroundColor: colors.surfaceAlt },
    headerText: { flex: 1, gap: 2 },
    title: {
      ...typography.body,
      color: colors.text,
    },
    hint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
    body: {
      padding: spacing.lg,
      paddingTop: 0,
      gap: spacing.lg,
    },
  });

export default ChangePasswordSection;
