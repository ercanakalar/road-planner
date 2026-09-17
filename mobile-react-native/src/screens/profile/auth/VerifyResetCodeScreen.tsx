import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from 'components/ui/PrimaryButton';
import {
  useRequestPasswordResetCodeMutation,
  useVerifyResetCodeMutation,
} from 'store/services/authenticationService';
import passwordResetLockout, {
  parseAttemptsRemaining,
  parseLockout,
} from 'services/passwordResetLockout';
import { formatWait } from 'utils/formatDuration';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  useThemedTextInputProps,
} from 'theme';
import type { ThemeColors } from 'theme';
import { RESET_CODE_LENGTH } from 'types/store/services/authenticationService-type';
import { RootStackParamList } from 'types/screens/screens';
import { useTranslation } from 'react-i18next';

const RESEND_COOLDOWN_SECONDS = 30;

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'VerifyResetCodeScreen'>;
};

const VerifyResetCodeScreen = ({ navigation, route }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const inputTheme = useThemedTextInputProps();

  const { email } = route.params;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );
  const [lockoutMs, setLockoutMs] = useState(0);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRef = useRef<TextInput>(null);

  const [verifyResetCode, { isLoading }] = useVerifyResetCodeMutation();
  const [requestCode, { isLoading: isResending }] =
    useRequestPasswordResetCodeMutation();

  useEffect(() => {
    passwordResetLockout.remainingMs(email).then(setLockoutMs);
  }, [email]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleChange = useCallback((value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, RESET_CODE_LENGTH));
    setError('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (code.length !== RESET_CODE_LENGTH) {
      setError(`Enter the ${RESET_CODE_LENGTH}-digit code.`);
      return;
    }

    try {
      const { resetToken } = await verifyResetCode({ email, code }).unwrap();
      await passwordResetLockout.clear(email);
      navigation.navigate('ResetPasswordScreen', { token: resetToken, email });
    } catch (caught) {
      const lockout = parseLockout(caught);

      if (lockout) {
        await passwordResetLockout.remember(email, lockout.lockedUntil);
        setLockoutMs(lockout.retryAfterSeconds * 1000);
        setAttemptsRemaining(0);
        setError('');
        return;
      }

      const remaining = parseAttemptsRemaining(caught);
      setAttemptsRemaining(remaining);
      setError(
        remaining !== null && remaining > 0
          ? `That code is not right. ${remaining} attempt${
              remaining === 1 ? '' : 's'
            } left.`
          : t('forms.codeIncorrect'),
      );
      setCode('');
      inputRef.current?.focus();
    }
  }, [code, email, navigation, verifyResetCode]);

  const handleResend = useCallback(async () => {
    try {
      await requestCode({ email }).unwrap();
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setCode('');
      setAttemptsRemaining(null);
      setError('');
    } catch {
      setError(t('forms.couldNotResend'));
    }
  }, [email, requestCode]);

  const isLocked = lockoutMs > 0;

  if (isLocked) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedIcon}>
          <Ionicons name='lock-closed' size={28} color={colors.danger} />
        </View>
        <Text style={styles.title}>{t('resetPassword.lockedTitle')}</Text>
        <Text style={styles.lockedBody}>
          {t('resetPassword.lockedBody', {
            email,
            wait: formatWait(lockoutMs),
          })}
        </Text>
        <PrimaryButton
          label={t('actions.backToSignIn')}
          variant='secondary'
          onPress={() => navigation.navigate('SignInScreen')}
          style={styles.lockedAction}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.container}>
          <View style={styles.heading}>
            <Text style={styles.title}>
              {t('resetPassword.enterCodeTitle')}
            </Text>
            <Text style={styles.subtitle}>
              {t('resetPassword.codeSentTo', {
                length: RESET_CODE_LENGTH,
                email,
              })}
            </Text>
          </View>

          <Pressable
            style={styles.digits}
            onPress={() => inputRef.current?.focus()}
            accessibilityRole='button'
            accessibilityLabel={`Enter the ${RESET_CODE_LENGTH} digit code`}
          >
            {Array.from({ length: RESET_CODE_LENGTH }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.digit,
                  index === code.length && styles.digitActive,
                  !!error && styles.digitError,
                ]}
              >
                <Text style={styles.digitText}>{code[index] ?? ''}</Text>
              </View>
            ))}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChange}
            keyboardType='number-pad'
            textContentType='oneTimeCode'
            autoComplete='one-time-code'
            maxLength={RESET_CODE_LENGTH}
            autoFocus
            style={styles.hiddenInput}
            {...inputTheme}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {attemptsRemaining !== null && attemptsRemaining > 0 && !error ? (
            <Text style={styles.warning}>
              {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'}{' '}
              remaining.
            </Text>
          ) : null}

          <PrimaryButton
            label={t('actions.verifyCode')}
            onPress={handleSubmit}
            isLoading={isLoading}
            disabled={code.length !== RESET_CODE_LENGTH}
          />

          <Pressable
            onPress={handleResend}
            disabled={resendIn > 0 || isResending}
            hitSlop={8}
            style={styles.resend}
            accessibilityRole='button'
          >
            <Text
              style={[
                styles.resendText,
                resendIn > 0 && styles.resendTextDisabled,
              ]}
            >
              {resendIn > 0
                ? t('forms.resendIn', { seconds: resendIn })
                : t('forms.sendNewCode')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
    container: { gap: spacing.lg },
    heading: { gap: spacing.xs, marginBottom: spacing.sm },
    title: { ...typography.title, fontSize: 24, color: colors.text },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 19,
    },
    digits: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.md,
    },
    digit: {
      width: 52,
      height: 62,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    digitActive: { borderColor: colors.primary, borderWidth: 2 },
    digitError: { borderColor: colors.danger },
    digitText: { ...typography.title, fontSize: 24, color: colors.text },
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      height: 1,
      width: 1,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
    },
    warning: {
      ...typography.caption,
      color: colors.warning,
      textAlign: 'center',
    },
    resend: { alignSelf: 'center', paddingVertical: spacing.sm },
    resendText: { ...typography.label, color: colors.primary },
    resendTextDisabled: { color: colors.textSubtle },
    lockedContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    lockedIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      backgroundColor: colors.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockedBody: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 300,
    },
    lockedAction: { alignSelf: 'stretch', marginTop: spacing.md },
  });

export default VerifyResetCodeScreen;
