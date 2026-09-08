import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationProp } from '@react-navigation/native';

import AuthScreenLayout from 'components/auth/AuthScreenLayout';
import FormField from 'components/ui/FormField';
import PrimaryButton from 'components/ui/PrimaryButton';
import GoogleSignInButton from 'components/GoogleSignInButton';
import useSignInForm from 'hooks/auth/useSignInForm';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

type Props = { navigation: NavigationProp<RootStackParamList> };

const SignInScreen = ({ navigation }: Props) => {
  const styles = useThemedStyles(createStyles);

  const {
    values,
    handleChange,
    handleSubmit,
    isPending,
    error,
    goToSignUp,
    goToKvkk,
    goToForgotPassword,
  } = useSignInForm(navigation);

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
        value={values.email}
        onChangeText={handleChange('email')}
        autoCapitalize='none'
        autoComplete='email'
        keyboardType='email-address'
      />

      <FormField
        label='Password'
        placeholder='Your password'
        value={values.password}
        onChangeText={handleChange('password')}
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
        isLoading={isPending}
      />

      <GoogleSignInButton />

      <Pressable
        onPress={goToKvkk}
        hitSlop={10}
        style={styles.kvkk}
        accessibilityRole='button'
      >
        <Text style={styles.kvkkText}>KVKK consent</Text>
      </Pressable>
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
    kvkk: { alignSelf: 'center' },
    kvkkText: {
      ...typography.caption,
      color: colors.textMuted,
      textDecorationLine: 'underline',
    },
  });

export default SignInScreen;
