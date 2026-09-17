import { useCallback, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import FormField from 'components/ui/FormField';
import PrimaryButton from 'components/ui/PrimaryButton';
import { useResetPasswordMutation } from 'store/services/authenticationService';
import { showNotification } from 'services/notificationService';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';
import { useTranslation } from 'react-i18next';

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

type Props = {
    navigation: NavigationProp<RootStackParamList>;
    route: RouteProp<RootStackParamList, 'ResetPasswordScreen'>;
};

const ResetPasswordScreen = ({ navigation, route }: Props) => {
    const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

    const { token } = route.params;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    const validationError = useMemo(() => {
        if (!password || !confirmPassword) return t('forms.bothFieldsRequired');
        if (password.length < MIN_PASSWORD_LENGTH) {
            return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
        }
        if (!PASSWORD_PATTERN.test(password)) {
            return t('forms.passwordNeedsLetterAndNumber');
        }
        if (password !== confirmPassword) return t('forms.passwordsDoNotMatch');
        return '';
    }, [confirmPassword, password]);

    const handleSubmit = useCallback(async () => {
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            await resetPassword({ token, password, confirmPassword }).unwrap();
            showNotification({
                type: 'success',
                header: t('resetPassword.changedHeader'),
                message: t('resetPassword.changedMessage'),
            });
            navigation.reset({ index: 0, routes: [{ name: 'SignInScreen' }] });
        } catch {
            setError(
                t('forms.resetLinkInvalid'),
            );
        }
    }, [
        confirmPassword,
        navigation,
        password,
        resetPassword,
        token,
        validationError,
    ]);

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
                        <Text style={styles.title}>
                            {t('resetPassword.chooseNewTitle')}
                        </Text>
                        <Text style={styles.subtitle}>
                            {t('resetPassword.chooseNewSubtitle', {
                                length: MIN_PASSWORD_LENGTH,
                            })}
                        </Text>
                    </View>

                    <FormField
                        label={t('fields.newPassword')}
                        placeholder={t('fields.newPassword')}
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            setError('');
                        }}
                        autoComplete='new-password'
                        isPassword
                    />

                    <FormField
                        label={t('fields.confirmPassword')}
                        placeholder={t('resetPassword.newPasswordPlaceholder')}
                        value={confirmPassword}
                        onChangeText={(value) => {
                            setConfirmPassword(value);
                            setError('');
                        }}
                        autoComplete='new-password'
                        isPassword
                        error={error}
                    />

                    <PrimaryButton
                        label={t('actions.changePassword')}
                        onPress={handleSubmit}
                        isLoading={isLoading}
                    />
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
    });

export default ResetPasswordScreen;
