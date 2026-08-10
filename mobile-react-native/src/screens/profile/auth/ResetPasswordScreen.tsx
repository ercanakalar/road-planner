import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import FormField from 'components/FormField';
import PrimaryButton from 'components/PrimaryButton';
import { useResetPasswordMutation } from 'store/services/authenticationService';
import { showNotification } from 'services/notificationService';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'ResetPasswordScreen'>;
};

const ResetPasswordScreen = ({ navigation, route }: Props) => {
  const styles = useThemedStyles(createStyles);

  const { token } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const validationError = useMemo(() => {
    if (!password || !confirmPassword) return 'Both fields are required.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!PASSWORD_PATTERN.test(password)) {
      return 'Include at least one letter and one number.';
    }
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  }, [confirmPassword, password]);

  const handleSubmit = useCallback(async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await resetPassword({ token, password, confirmPassword }).unwrap();
      showNotification({
        type: 'success',
        header: 'Password changed',
        message: 'Sign in with your new password.',
      });
      navigation.reset({ index: 0, routes: [{ name: 'SignInScreen' }] });
    } catch {
      setError(
        'That reset link is no longer valid. Request a new code and try again.',
      );
    }
  }, [
    confirmPassword,
    navigation,
    password,
    resetPassword,
    token,
    validationError,
  ]);

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
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.subtitle}>
              At least {MIN_PASSWORD_LENGTH} characters, with a letter and a
              number. Signing in again will be required on every device.
            </Text>
          </View>

          <FormField
            label='New password'
            placeholder='New password'
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
            }}
            autoComplete='new-password'
            isPassword
          />

          <FormField
            label='Confirm password'
            placeholder='Repeat your new password'
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setError('');
            }}
            autoComplete='new-password'
            isPassword
            error={error}
          />

          <PrimaryButton
            label='Change password'
            onPress={handleSubmit}
            isLoading={isLoading}
          />
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
  });

export default ResetPasswordScreen;
