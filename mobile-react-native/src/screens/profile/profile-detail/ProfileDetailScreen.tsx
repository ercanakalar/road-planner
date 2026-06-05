import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { TextInput, Button, Checkbox, Text } from 'react-native-paper';

import {
  profileService,
  useUpdateUserMutation,
} from 'store/services/profileService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { updateUserProfile } from 'store/slices/userSlice';
import { useAppStateGoBack } from 'hooks/useAppStateGoBack';
import { showNotification } from 'services/notificationService';
import { ProfileDetailScreenProps } from 'types/screens/detailsScreenType';
import { ProfileForm } from 'types/store/services/userService-type';

const ProfileDetailScreen = ({ navigation }: ProfileDetailScreenProps) => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken) ?? '';
  const { data, isLoading } = useAppSelector((state) => state.user);

  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    nickName: '',
  });
  const [isCorporate, setIsCorporate] = useState(false);

  useAppStateGoBack(navigation);

  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  useEffect(() => {
    if (!data) return;
    setForm({
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      nickName: data.nickName ?? '',
    });
  }, [data]);

  const onChangeText = useCallback(
    (field: keyof ProfileForm) => (value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleUpdateProfile = useCallback(async () => {
    if (!data?.id) return;

    try {
      await updateUser({
        accessToken,
        id: data.id,
        ...form,
        isCorporate,
      }).unwrap();

      dispatch(updateUserProfile({ ...form }));
      dispatch(
        profileService.util.updateQueryData(
          'getUser',
          { userId: data.id, accessToken },
          (draft) => {
            Object.assign(draft as ProfileForm, form);
          },
        ),
      );

      navigation.goBack();
    } catch (error) {
      showNotification({
        type: 'error',
        header: 'Update Failed',
        message: 'Failed to update profile. Please try again.',
      });
    }
  }, [
    accessToken,
    data?.id,
    form,
    isCorporate,
    updateUser,
    dispatch,
    navigation,
  ]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size='large' color='#0000ff' />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        label='First Name'
        value={form.firstName}
        onChangeText={onChangeText('firstName')}
        mode='outlined'
        style={styles.input}
      />
      <TextInput
        label='Last Name'
        value={form.lastName}
        onChangeText={onChangeText('lastName')}
        mode='outlined'
        style={styles.input}
      />
      <TextInput
        label='Email'
        value={data?.email ?? ''}
        disabled
        editable={false}
        mode='outlined'
        style={styles.input}
      />
      <TextInput
        label='Nick Name'
        value={form.nickName}
        onChangeText={onChangeText('nickName')}
        mode='outlined'
        style={styles.input}
      />

      <View style={styles.checkboxRow}>
        <Checkbox
          status={isCorporate ? 'checked' : 'unchecked'}
          onPress={() => setIsCorporate((prev) => !prev)}
        />
        <Text style={styles.checkText}>
          I want to be informed about opportunities for workplace shopping.
        </Text>
      </View>

      <Button
        mode='contained'
        onPress={handleUpdateProfile}
        loading={isUpdating}
        disabled={isUpdating}
        style={styles.updateButton}
      >
        Update
      </Button>
    </ScrollView>
  );
};

export default ProfileDetailScreen;

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  input: { marginBottom: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  checkText: { width: '90%', paddingRight: 8 },
  updateButton: { marginTop: 20 },
});
