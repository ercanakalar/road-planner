import { Pressable, StyleSheet, Text } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const {
    values,
    handleChange,
    handleSubmit,
    isPending,
    error,
    goToSignUp,
    goToKvkk,
    goToForgotPassword,
    handleSignedIn,
  } = useSignInForm(navigation);

  return (
    <AuthScreenLayout
      title={t('auth.welcomeBack')}
      subtitle={t('auth.welcomeBackSubtitle')}
      footerText={t('auth.noAccount')}
      footerActionLabel={t('auth.signUp')}
      onFooterAction={goToSignUp}
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
        placeholder={t('auth.passwordPlaceholder')}
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
        <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
      </Pressable>

      <PrimaryButton
        label={t('common.signIn')}
        onPress={handleSubmit}
        isLoading={isPending}
      />

      <GoogleSignInButton onSuccess={handleSignedIn} />

      <Pressable
        onPress={goToKvkk}
        hitSlop={10}
        style={styles.kvkk}
        accessibilityRole='button'
      >
        <Text style={styles.kvkkText}>{t('profile.kvkkConsent')}</Text>
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
