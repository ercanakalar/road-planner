import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import FormField from 'components/ui/FormField';
import PrimaryButton from 'components/ui/PrimaryButton';
import useForgotPasswordForm from 'hooks/auth/useForgotPasswordForm';
import { formatWait } from 'utils/formatDuration';

import { radius, spacing, typography, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'ForgotPasswordScreen'>;
};

const ForgotPasswordScreen = ({ navigation, route }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const {
    values,
    handleChange,
    handleSubmit,
    isPending,
    error,
    lockoutMs,
    isLocked,
  } = useForgotPasswordForm(navigation, route.params?.email ?? '');

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
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              We will email you a 5-digit code. It expires shortly after it
              arrives.
            </Text>
          </View>

          {isLocked ? (
            <View style={styles.notice}>
              <Ionicons
                name='lock-closed-outline'
                size={18}
                color={colors.danger}
              />
              <Text style={styles.noticeText}>
                Too many incorrect codes were entered for this address. You can
                try again in {formatWait(lockoutMs)}.
              </Text>
            </View>
          ) : null}

          <FormField
            label='Email'
            placeholder='you@example.com'
            value={values.email}
            onChangeText={handleChange('email')}
            autoCapitalize='none'
            autoComplete='email'
            keyboardType='email-address'
            error={error}
          />

          <PrimaryButton
            label='Send code'
            onPress={handleSubmit}
            isLoading={isPending}
            disabled={isLocked}
          />

          <Text style={styles.footnote}>
            If an account exists for that address, the code will arrive in a few
            moments. Check your spam folder if you do not see it.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
    container: { gap: spacing.lg },
    heading: { gap: spacing.xs, marginBottom: spacing.sm },
    title: { ...typography.title, fontSize: 24, color: colors.text },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 19,
    },
    notice: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.dangerSoft,
    },
    noticeText: {
      ...typography.caption,
      color: colors.danger,
      flex: 1,
      lineHeight: 18,
    },
    footnote: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSubtle,
      lineHeight: 17,
      textAlign: 'center',
    },
  });

export default ForgotPasswordScreen;
