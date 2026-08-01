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
import { NavigationProp, useNavigation } from '@react-navigation/native';

import FormField from 'components/FormField';
import PrimaryButton from 'components/PrimaryButton';
import { useSignUpMutation } from 'store/services/authenticationService';

import { colors, spacing, typography } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type SignUpRequest = {
  email: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_FORM: SignUpRequest = {
  email: '',
  password: '',
  confirmPassword: '',
};

export default function SignUpScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [form, setForm] = useState<SignUpRequest>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [signUp, { isLoading }] = useSignUpMutation();

  const handleInputChange = useCallback(
    (field: keyof SignUpRequest) => (value: string) => {
      setForm((previous) => ({ ...previous, [field]: value }));
      setError('');
    },
    [],
  );

  const validationError = useMemo(() => {
    if (!form.email || !form.password || !form.confirmPassword) {
      return 'All fields are required.';
    }
    if (!EMAIL_PATTERN.test(form.email)) return 'Enter a valid email address.';
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match.';
    }
    return '';
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await signUp(form).unwrap();
      setError('');
      navigation.navigate('HomeTabNavigator', { screen: 'Routes' });
    } catch {
      setError('Sign-up failed. Please try again.');
    }
  }, [form, navigation, signUp, validationError]);

  const goToSignIn = useCallback(
    () => navigation.navigate('SignInScreen'),
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
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Plan routes and save the places you care about.
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
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={form.password}
            onChangeText={handleInputChange('password')}
            autoComplete='new-password'
            isPassword
          />

          <FormField
            label='Confirm password'
            placeholder='Repeat your password'
            value={form.confirmPassword}
            onChangeText={handleInputChange('confirmPassword')}
            autoComplete='new-password'
            isPassword
            error={error}
          />

          <PrimaryButton
            label='Create account'
            onPress={handleSubmit}
            isLoading={isLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={goToSignIn} hitSlop={8}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
