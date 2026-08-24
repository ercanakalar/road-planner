import React, { useCallback, useMemo, useState } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import AuthScreenLayout from 'components/auth/AuthScreenLayout';
import FormField from 'components/ui/FormField';
import PrimaryButton from 'components/ui/PrimaryButton';
import { useSignUpMutation } from 'store/services/authenticationService';
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
    <AuthScreenLayout
      icon='person-add'
      title='Create your account'
      subtitle='Plan routes and save the places you care about.'
      footerText='Already have an account?'
      footerActionLabel='Sign in'
      onFooterAction={goToSignIn}
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

      {/* Google sign-up is off for now. To bring it back: import
          components/auth/GoogleSignInButton and render
          <GoogleSignInButton label='Sign up with Google' /> here. */}
    </AuthScreenLayout>
  );
}
