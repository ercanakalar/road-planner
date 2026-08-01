import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';

import ScreenState from 'components/ScreenState';
import {
  useGetUserQuery,
  useUpdateUserMutation,
} from 'store/services/profileService';
import { useAppDispatch } from 'store/hook';
import { updateUserProfile } from 'store/slices/userSlice';
import { showNotification } from 'services/notificationService';

import { colors, radius, spacing, typography } from 'theme';
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

const FIELDS: { key: keyof ProfileForm; label: string }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'nickName', label: 'Nickname' },
];

const ProfileDetailScreen = ({ navigation, route }: Props) => {
  const dispatch = useAppDispatch();
  const { userId } = route.params;

  const { data, isLoading, isError } = useGetUserQuery(
    { userId },
    { skip: !userId },
  );
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

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
      !!data &&
      FIELDS.some(({ key }) => (data[key] ?? '') !== form[key].trim()),
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
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps='handled'
    >
      {FIELDS.map(({ key, label }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            value={form[key]}
            onChangeText={onChangeText(key)}
            style={styles.input}
            placeholderTextColor={colors.textSubtle}
            autoCapitalize='words'
          />
        </View>
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={data.email ?? ''}
          editable={false}
          style={[styles.input, styles.inputDisabled]}
        />
        <Text style={styles.hint}>Your email address cannot be changed.</Text>
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
      >
        {isUpdating ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.buttonText}>Save changes</Text>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: { gap: spacing.sm },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    fontSize: 11,
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
