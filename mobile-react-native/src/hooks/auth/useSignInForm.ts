import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';

import useFormAction from 'hooks/common/useFormAction';
import useSignedIn from 'hooks/auth/useSignedIn';
import { useSignInMutation } from 'store/services/authenticationService';
import { SignInRequest } from 'types/libs/auth';
import { RootStackParamList } from 'types/screens/screens';
import i18n from 'i18n';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM: SignInRequest = { email: '', password: '' };

const validate = ({ email, password }: SignInRequest) => {
  if (!email || !password) return i18n.t('forms.bothFieldsRequired');
  if (!EMAIL_PATTERN.test(email)) return i18n.t('forms.validEmail');
  return '';
};

export function useSignInForm(navigation: NavigationProp<RootStackParamList>) {
  const [signIn] = useSignInMutation();
  const handleSignedIn = useSignedIn();

  const submit = useCallback(
    async (credentials: SignInRequest) => {
      await signIn(credentials).unwrap();
      handleSignedIn();
    },
    [handleSignedIn, signIn],
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

  return { ...form, handleSignedIn, goToSignUp, goToKvkk, goToForgotPassword };
}

export default useSignInForm;
