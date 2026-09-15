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
  { key: 'firstName', label: 'First name', autoCapitalize: 'words' },
  { key: 'lastName', label: 'Last name', autoCapitalize: 'words' },
  {
    key: 'nickName',
    label: 'Nickname',
    hint: 'The name shown on the routes you publish.',
    autoCapitalize: 'none',
  },
];

const ProfileDetailScreen = ({ navigation, route }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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

  /**
   * The upload is awaited rather than fired and forgotten: a rejected mutation
   * only lands in RTK Query's own state, so without this the spinner stops,
   * the avatar stays as it was, and nothing on screen says whether the file
   * was the wrong sort, too large, or never left the phone.
   */
  const handlePickPhoto = useCallback(
    async (photo: PickedPhoto) => {
      try {
        await updatePhoto(photo).unwrap();
      } catch (error) {
        // The toast is written for the person holding the phone; the raw
        // failure is what someone reading the logs needs, and the two are
        // rarely the same sentence.
        if (__DEV__) console.warn('Avatar upload failed', error);

        showNotification({
          type: 'error',
          header: 'Upload failed',
          message: apiErrorMessage(
            error,
            'Your photo could not be uploaded. Please try again.',
          ),
        });
      }
    },
    [updatePhoto],
  );

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

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

  const handleUpdateProfile = useCallback(async () => {
    if (!data?.id) return;

    try {
      await updateUser({ ...data, ...form }).unwrap();
      dispatch(updateUserProfile(form));
      navigation.goBack();
    } catch {
      showNotification({
        type: 'error',
        header: 'Update failed',
        message: 'Could not save your profile. Please try again.',
      });
    }
  }, [data, dispatch, form, navigation, updateUser]);

  if (isLoading) {
    return <ScreenState variant='loading' title='Loading profile…' />;
  }

  if (isError || !data) {
    return (
      <ScreenState
        variant='error'
        title='Could not load your profile'
        message='Check your connection and try again.'
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

        {/*
          One card for the fields that can change, so the read-only address
          below it reads as a different kind of thing rather than as a box
          somebody forgot to make editable.
        */}
        <View style={styles.card}>
          {FIELDS.map(({ key, label, hint, autoCapitalize }, index) => (
            <View
              key={key}
              style={[styles.field, index > 0 && styles.fieldDivided]}
            >
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={form[key]}
                onChangeText={onChangeText(key)}
                style={styles.input}
                {...inputTheme}
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                returnKeyType='done'
              />
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
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
            <Text style={styles.hint}>
              Your email address cannot be changed.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleUpdateProfile}
          disabled={isUpdating || !isDirty}
          style={({ pressed }) => [
            styles.button,
            (isUpdating || !isDirty) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole='button'
          accessibilityState={{ disabled: isUpdating || !isDirty }}
        >
          {isUpdating ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>
              {isDirty ? 'Save changes' : 'Nothing to save'}
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
