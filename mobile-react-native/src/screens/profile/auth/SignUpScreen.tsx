import AuthScreenLayout from 'components/auth/AuthScreenLayout';
import FormField from 'components/ui/FormField';
import PrimaryButton from 'components/ui/PrimaryButton';
import GoogleSignInButton from 'components/GoogleSignInButton';
import useSignUpForm, { MIN_PASSWORD_LENGTH } from 'hooks/auth/useSignUpForm';

export default function SignUpScreen() {
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
      title='Create your account'
      subtitle='Plan routes and save the places you care about.'
      footerText='Already have an account?'
      footerActionLabel='Sign in'
      onFooterAction={goToSignIn}
    >
      <FormField
        label='Email'
        placeholder='you@example.com'
        value={values.email}
        onChangeText={handleChange('email')}
        autoCapitalize='none'
        autoComplete='email'
        keyboardType='email-address'
      />

      <FormField
        label='Password'
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        value={values.password}
        onChangeText={handleChange('password')}
        autoComplete='new-password'
        isPassword
      />

      <FormField
        label='Confirm password'
        placeholder='Repeat your password'
        value={values.confirmPassword}
        onChangeText={handleChange('confirmPassword')}
        autoComplete='new-password'
        isPassword
        error={error}
      />

      <PrimaryButton
        label='Create account'
        onPress={handleSubmit}
        isLoading={isPending}
      />

      <GoogleSignInButton label='Sign up with Google' />
    </AuthScreenLayout>
  );
}
