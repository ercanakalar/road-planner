import { useCallback } from 'react';
import { NavigationProp } from '@react-navigation/native';

import useFormAction from 'hooks/common/useFormAction';
import usePasswordResetLockout from 'hooks/auth/usePasswordResetLockout';
import { EMAIL_PATTERN } from 'hooks/auth/useSignInForm';
import { useRequestPasswordResetCodeMutation } from 'store/services/authenticationService';
import { RootStackParamList } from 'types/screens/screens';

type ForgotPasswordValues = { email: string };

const validate = ({ email }: ForgotPasswordValues) =>
  EMAIL_PATTERN.test(email.trim()) ? '' : 'Enter a valid email address.';

/**
 * Asking for a reset code: one address, and the lockout that too many wrong
 * codes for that address leaves behind.
 */
export function useForgotPasswordForm(
  navigation: NavigationProp<RootStackParamList>,
  initialEmail = '',
) {
  const [requestCode] = useRequestPasswordResetCodeMutation();

  const submit = useCallback(
    async ({ email }: ForgotPasswordValues) => {
      const trimmed = email.trim();
      await requestCode({ email: trimmed }).unwrap();
      navigation.navigate('VerifyResetCodeScreen', { email: trimmed });
    },
    [navigation, requestCode],
  );

  const form = useFormAction({
    initialValues: { email: initialEmail },
    validate,
    submit,
    failureMessage: 'Could not send the code. Please try again.',
  });

  const trimmedEmail = form.values.email.trim();
  const lockoutMs = usePasswordResetLockout(
    trimmedEmail,
    EMAIL_PATTERN.test(trimmedEmail),
  );

  return { ...form, lockoutMs, isLocked: lockoutMs > 0 };
}

export default useForgotPasswordForm;
