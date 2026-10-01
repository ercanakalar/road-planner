import { useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';

import useFormAction from 'hooks/common/useFormAction';
import useSignedIn from 'hooks/auth/useSignedIn';
import { useSignUpMutation } from 'store/services/authenticationService';
import { EMAIL_PATTERN } from 'hooks/auth/useSignInForm';
import { RootStackParamList } from 'types/screens/screens';
import i18n from 'i18n';

// Mirrors the API (PASSWORD_MIN_LENGTH, PASSWORD_PATTERN): 8+, a letter and a digit.
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

type SignUpValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_FORM: SignUpValues = {
  email: '',
  password: '',
  confirmPassword: '',
};

const validate = ({ email, password, confirmPassword }: SignUpValues) => {
  if (!email || !password || !confirmPassword)
    return i18n.t('forms.allFieldsRequired');
  if (!EMAIL_PATTERN.test(email)) return i18n.t('forms.validEmail');
  if (password.length < MIN_PASSWORD_LENGTH || !PASSWORD_PATTERN.test(password)) {
    return i18n.t('forms.passwordRules', { count: MIN_PASSWORD_LENGTH });
  }
  if (password !== confirmPassword) return i18n.t('forms.passwordsDoNotMatch');
  return '';
};

export function useSignUpForm() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [signUp] = useSignUpMutation();
  const handleSignedIn = useSignedIn();

  const submit = useCallback(
    async (values: SignUpValues) => {
      await signUp(values).unwrap();
      handleSignedIn();
    },
    [handleSignedIn, signUp],
  );

  const form = useFormAction({
    initialValues: EMPTY_FORM,
    validate,
    submit,
    failureMessage: i18n.t('forms.signUpFailed'),
  });

  const goToSignIn = useCallback(
    () => navigation.navigate('SignInScreen'),
    [navigation],
  );

  return { ...form, goToSignIn };
}

export default useSignUpForm;
