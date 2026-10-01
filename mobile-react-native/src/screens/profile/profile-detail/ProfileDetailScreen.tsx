import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import AvatarPicker from 'components/profile/AvatarPicker';
import ScreenState from 'components/ui/ScreenState';
import useNicknameCheck, {
  canSaveNickname,
  NicknameStatus,
} from 'hooks/profile/useNicknameCheck';
import {
  useGetUserQuery,
  useUpdatePhotoMutation,
  useUpdateUserMutation,
} from 'store/services/profileService';
import { apiErrorMessage } from 'store/bases/apiErrorMessage';
import { useAppDispatch } from 'store/hook';
import { updateUserProfile } from 'store/slices/userSlice';
import { showNotification } from 'services/notificationService';
import { PickedPhoto } from 'utils/photoUpload';
import { NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from 'utils/nickname';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  useThemedTextInputProps,
} from 'theme';
import type { ThemeColors } from 'theme';
import { ProfileForm } from 'types/store/services/userService-type';
import { RootStackParamList } from 'types/screens/screens';
import { useTranslation } from 'react-i18next';

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'ProfileDetailScreen'>;
};

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  nickName: '',
};

const FIELDS: {
  key: keyof ProfileForm;
  label: string;
  hint?: string;
  autoCapitalize: 'words' | 'none';
}[] = [
  { key: 'firstName', label: 'forms.firstName', autoCapitalize: 'words' },
  { key: 'lastName', label: 'forms.lastName', autoCapitalize: 'words' },
  {
    key: 'nickName',
    label: 'forms.nickName',
    hint: 'forms.nickNameHint',
    autoCapitalize: 'none',
  },
];

const HTTP_CONFLICT = 409;

type StatusLine = {
  text: string;
  icon: keyof typeof Ionicons.glyphMap | null;
  tone: 'muted' | 'success' | 'danger';
};

const NicknameStatusLine = ({ status }: { status: NicknameStatus }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const line = ((): StatusLine | null => {
    switch (status.kind) {
      case 'checking':
        return { text: t('forms.nickNameChecking'), icon: null, tone: 'muted' };
      case 'available':
        return {
          text: t('forms.nickNameAvailable'),
          icon: 'checkmark-circle',
          tone: 'success',
        };
      case 'taken':
        return {
          text: t('forms.nickNameTaken'),
          icon: 'close-circle',
          tone: 'danger',
        };
      case 'required':
        return {
          text: t('forms.nickNameRequired'),
          icon: 'alert-circle',
          tone: 'danger',
        };
      case 'unverified':
        return {
          text: t('forms.nickNameUnverified'),
          icon: 'help-circle',
          tone: 'muted',
        };
      case 'invalid':
        return {
          text:
            status.problem === 'tooShort'
              ? t('forms.nickNameTooShort', { count: NICKNAME_MIN_LENGTH })
              : status.problem === 'tooLong'
                ? t('forms.nickNameTooLong', { count: NICKNAME_MAX_LENGTH })
                : t('forms.nickNameCharacters'),
          icon: 'alert-circle',
          tone: 'danger',
        };
      default:
        return null;
    }
  })();

  if (!line) return null;

  const color =
    line.tone === 'success'
      ? colors.success
      : line.tone === 'danger'
        ? colors.danger
        : colors.textMuted;

  return (
    <View style={styles.status} accessibilityLiveRegion='polite'>
      {line.icon ? (
        <Ionicons name={line.icon} size={14} color={color} />
      ) : (
        <ActivityIndicator size='small' color={color} />
      )}
      <Text style={[styles.statusText, { color }]}>{line.text}</Text>
    </View>
  );
};

const ProfileDetailScreen = ({ navigation, route }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const inputTheme = useThemedTextInputProps();

  const dispatch = useAppDispatch();
  const { userId } = route.params;

  const { data, isLoading, isError } = useGetUserQuery(
    { userId },
    { skip: !userId },
  );
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [updatePhoto, { isLoading: isUploadingPhoto }] =
    useUpdatePhotoMutation();

  const handlePickPhoto = useCallback(
    async (photo: PickedPhoto) => {
      try {
        await updatePhoto(photo).unwrap();
      } catch (error) {
        if (__DEV__) console.warn('Avatar upload failed', error);

        showNotification({
          type: 'error',
          header: t('toast.uploadFailed'),
          message: apiErrorMessage(error, t('toast.photoUploadFailed')),
        });
      }
    },
    [t, updatePhoto],
  );

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [takenNickname, setTakenNickname] = useState<string | null>(null);

  const nicknameStatus = useNicknameCheck(
    form.nickName,
    data?.nickName,
    takenNickname,
  );

  useEffect(() => {
    if (!data) return;
    setForm({
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      nickName: data.nickName ?? '',
    });
  }, [data]);

  const onChangeText = useCallback(
    (field: keyof ProfileForm) => (value: string) =>
      setForm((previous) => ({ ...previous, [field]: value })),
    [],
  );

  const isDirty = useMemo(
    () =>
      !!data && FIELDS.some(({ key }) => (data[key] ?? '') !== form[key].trim()),
    [data, form],
  );

  const canSave = isDirty && canSaveNickname(nicknameStatus);

  const handleUpdateProfile = useCallback(async () => {
    if (!data?.id || !canSave) return;

    try {
      await updateUser({ ...data, ...form }).unwrap();
      dispatch(updateUserProfile(form));
      navigation.goBack();
    } catch (error) {
      // Someone may have taken the nickname since it was checked; remember
      // it, so the field says so instead of offering it again.
      if ((error as { status?: unknown })?.status === HTTP_CONFLICT) {
        setTakenNickname(form.nickName.trim());
      }

      showNotification({
        type: 'error',
        header: t('toast.updateFailed'),
        message: apiErrorMessage(error, t('toast.profileSaveFailed')),
      });
    }
  }, [canSave, data, dispatch, form, navigation, t, updateUser]);

  if (isLoading) {
    return <ScreenState variant='loading' title={t('states.loadingProfile')} />;
  }

  if (isError || !data) {
    return (
      <ScreenState
        variant='error'
        title={t('states.couldNotLoadProfile')}
        message={t('states.checkConnection')}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarCard}>
          <AvatarPicker
            photo={data.photo}
            isUploading={isUploadingPhoto}
            onPicked={handlePickPhoto}
          />
        </View>

        <View style={styles.card}>
          {FIELDS.map(({ key, label, hint, autoCapitalize }, index) => (
            <View
              key={key}
              style={[styles.field, index > 0 && styles.fieldDivided]}
            >
              <Text style={styles.label}>{t(label)}</Text>
              <TextInput
                value={form[key]}
                onChangeText={onChangeText(key)}
                style={styles.input}
                {...inputTheme}
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                returnKeyType='done'
              />
              {key === 'nickName' ? (
                <NicknameStatusLine status={nicknameStatus} />
              ) : null}
              {hint ? <Text style={styles.hint}>{t(hint)}</Text> : null}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('fields.email')}</Text>
            <View style={styles.readOnly}>
              <Ionicons
                name='lock-closed-outline'
                size={16}
                color={colors.textSubtle}
              />
              <Text style={styles.readOnlyText} numberOfLines={1}>
                {data.email || '—'}
              </Text>
            </View>
            <Text style={styles.hint}>{t('fields.emailUnchangeable')}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleUpdateProfile}
          disabled={isUpdating || !canSave}
          style={({ pressed }) => [
            styles.button,
            (isUpdating || !canSave) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole='button'
          accessibilityState={{ disabled: isUpdating || !canSave }}
        >
          {isUpdating ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>
              {isDirty ? t('forms.saveChanges') : t('forms.nothingToSave')}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      padding: spacing.lg,
      gap: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    avatarCard: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    card: {
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      ...shadows.sm,
    },
    field: { gap: spacing.sm, padding: spacing.md },
    fieldDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    label: {
      ...typography.label,
      color: colors.textMuted,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
    },
    readOnly: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceAlt,
    },
    readOnlyText: {
      ...typography.body,
      color: colors.textMuted,
      flexShrink: 1,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSubtle,
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    statusText: {
      ...typography.caption,
      flexShrink: 1,
    },
    button: {
      marginTop: spacing.sm,
      height: 50,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: { backgroundColor: colors.primaryDark },
    buttonDisabled: { backgroundColor: colors.borderStrong },
    buttonText: {
      ...typography.body,
      color: colors.textInverse,
    },
  });

export default ProfileDetailScreen;
