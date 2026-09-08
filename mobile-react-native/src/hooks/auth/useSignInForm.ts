import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';

import useFormAction from 'hooks/common/useFormAction';
import { useSignInMutation } from 'store/services/authenticationService';
import { SignInRequest } from 'types/libs/auth';
import { RootStackParamList } from 'types/screens/screens';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM: SignInRequest = { email: '', password: '' };

const validate = ({ email, password }: SignInRequest) => {
  if (!email || !password) return 'Both fields are required.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return '';
};

export function useSignInForm(navigation: NavigationProp<RootStackParamList>) {
  const [signIn] = useSignInMutation();

  const submit = useCallback(
    async (credentials: SignInRequest) => {
      await signIn(credentials).unwrap();
      navigation.navigate('HomeTabNavigator', { screen: 'Routes' });
    },
    [navigation, signIn],
  );

  const form = useFormAction({
    initialValues: EMPTY_FORM,
    validate,
    submit,
    failureMessage: 'Sign-in failed. Please check your credentials.',
  });

  const goToSignUp = useCallback(
    () => navigation.navigate('SignUpScreen'),
    [navigation],
  );

  const goToKvkk = useCallback(
    () => navigation.navigate('KvkkScreen'),
    [navigation],
  );

  const goToForgotPassword = useCallback(
    () =>
      navigation.navigate('ForgotPasswordScreen', {
        email: form.values.email.trim() || undefined,
      }),
    [form.values.email, navigation],
  );

  return { ...form, goToSignUp, goToKvkk, goToForgotPassword };
}

export default useSignInForm;
