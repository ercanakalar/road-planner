import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';

import FormField from 'components/FormField';
import PrimaryButton from 'components/PrimaryButton';
import { useSignInMutation } from 'store/services/authenticationService';

import { colors, spacing, typography } from 'theme';
import { SignInRequest } from 'types/libs/auth';
import { RootStackParamList } from 'types/screens/screens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = { navigation: NavigationProp<RootStackParamList> };

const SignInScreen = ({ navigation }: Props) => {
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

  const goToSignUp = useCallback(
    () => navigation.navigate('SignUpScreen'),
    [navigation],
  );

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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to pick up where you left off.
            </Text>
          </View>

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

          <PrimaryButton
            label='Sign in'
            onPress={handleSubmit}
            isLoading={isLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={goToSignUp} hitSlop={8}>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  container: { gap: spacing.lg },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  title: {
    ...typography.title,
    fontSize: 26,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footerLink: {
    ...typography.label,
    color: colors.primary,
  },
});

export default SignInScreen;
