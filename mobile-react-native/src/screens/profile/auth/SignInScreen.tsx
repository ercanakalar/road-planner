import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationProp } from '@react-navigation/native';

import AuthScreenLayout from 'components/AuthScreenLayout';
import FormField from 'components/FormField';
import GoogleSignInButton from 'components/GoogleSignInButton';
import PrimaryButton from 'components/PrimaryButton';
import { useSignInMutation } from 'store/services/authenticationService';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { SignInRequest } from 'types/libs/auth';
import { RootStackParamList } from 'types/screens/screens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = { navigation: NavigationProp<RootStackParamList> };

const SignInScreen = ({ navigation }: Props) => {
  const styles = useThemedStyles(createStyles);

  const [form, setForm] = useState<SignInRequest>({ email: '', password: '' });
  const [error, setError] = useState('');
  const [signIn, { isLoading }] = useSignInMutation();

  const handleInputChange = useCallback(
    (field: keyof SignInRequest) => (value: string) => {
      setForm((previous) => ({ ...previous, [field]: value }));
      setError('');
    },
    [],
  );

  const validationError = useMemo(() => {
    if (!form.email || !form.password) return 'Both fields are required.';
    if (!EMAIL_PATTERN.test(form.email)) return 'Enter a valid email address.';
    return '';
  }, [form.email, form.password]);

  const handleSubmit = useCallback(async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await signIn(form).unwrap();
      setError('');
      navigation.navigate('HomeTabNavigator', { screen: 'Routes' });
    } catch {
      setError('Sign-in failed. Please check your credentials.');
    }
  }, [form, navigation, signIn, validationError]);

  const goToRoutes = useCallback(
    () => navigation.navigate('HomeTabNavigator', { screen: 'Routes' }),
    [navigation],
  );

  const goToSignUp = useCallback(
    () => navigation.navigate('SignUpScreen'),
    [navigation],
  );

  const goToForgotPassword = useCallback(
    () =>
      navigation.navigate('ForgotPasswordScreen', {
        email: form.email.trim() || undefined,
      }),
    [form.email, navigation],
  );

  return (
    <AuthScreenLayout
      icon='navigate'
      title='Welcome back'
      subtitle='Sign in to pick up where you left off.'
      footerText="Don't have an account?"
      footerActionLabel='Sign up'
      onFooterAction={goToSignUp}
    >
      <FormField
        label='Email'
        placeholder='you@example.com'
        value={form.email}
        onChangeText={handleInputChange('email')}
        autoCapitalize='none'
        autoComplete='email'
        keyboardType='email-address'
      />

      <FormField
        label='Password'
        placeholder='Your password'
        value={form.password}
        onChangeText={handleInputChange('password')}
        autoComplete='current-password'
        isPassword
        error={error}
      />

      <Pressable
        onPress={goToForgotPassword}
        hitSlop={10}
        style={styles.forgot}
        accessibilityRole='button'
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      <PrimaryButton
        label='Sign in'
        onPress={handleSubmit}
        isLoading={isLoading}
      />

      <GoogleSignInButton onSuccess={goToRoutes} />
    </AuthScreenLayout>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    forgot: { alignSelf: 'flex-end', marginTop: -spacing.xs },
    forgotText: {
      ...typography.label,
      fontWeight: '700',
      color: colors.primary,
    },
  });

export default SignInScreen;
