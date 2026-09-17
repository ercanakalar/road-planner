import { useTranslation } from 'react-i18next';

import AuthScreenLayout from 'components/auth/AuthScreenLayout';
import FormField from 'components/ui/FormField';
import PrimaryButton from 'components/ui/PrimaryButton';
import GoogleSignInButton from 'components/GoogleSignInButton';
import useSignUpForm, { MIN_PASSWORD_LENGTH } from 'hooks/auth/useSignUpForm';
import useSignedIn from 'hooks/auth/useSignedIn';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const handleSignedIn = useSignedIn();

  const {
    values,
    handleChange,
    handleSubmit,
    isPending,
    error,
    goToSignIn,
  } = useSignUpForm();

  return (
    <AuthScreenLayout
      title={t('auth.createAccount')}
      subtitle={t('auth.createAccountSubtitle')}
      footerText={t('auth.haveAccount')}
      footerActionLabel={t('common.signIn')}
      onFooterAction={goToSignIn}
    >
      <FormField
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        value={values.email}
        onChangeText={handleChange('email')}
        autoCapitalize='none'
        autoComplete='email'
        keyboardType='email-address'
      />

      <FormField
        label={t('auth.password')}
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        value={values.password}
        onChangeText={handleChange('password')}
        autoComplete='new-password'
        isPassword
      />

      <FormField
        label={t('fields.confirmPassword')}
        placeholder={t('fields.repeatPassword')}
        value={values.confirmPassword}
        onChangeText={handleChange('confirmPassword')}
        autoComplete='new-password'
        isPassword
        error={error}
      />

      <PrimaryButton
        label={t('actions.createAccount')}
        onPress={handleSubmit}
        isLoading={isPending}
      />

      <GoogleSignInButton
        label={t('auth.signUpWithGoogle')}
        onSuccess={handleSignedIn}
      />
    </AuthScreenLayout>
  );
}
