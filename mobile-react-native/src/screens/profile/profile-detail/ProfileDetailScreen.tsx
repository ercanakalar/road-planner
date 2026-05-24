import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { NavigationProp } from '@react-navigation/native';
import { TextInput, Button, Checkbox, Text } from 'react-native-paper';

import { useUpdateUserMutation } from 'store/services/profileService';
import { useAppDispatch, useAppSelector } from 'store/hook';

import { updateUserProfile } from 'store/slices/userSlice';
import { useAppStateGoBack } from 'hooks/useAppStateGoBack';

const ProfileDetailScreen = ({
  navigation,
  route,
}: {
  navigation: NavigationProp<any>;
  route: any;
}) => {
  const { accessToken } = route.params;
  const dispatch = useAppDispatch();
  const { data, isLoading } = useAppSelector((state) => state.user);

  const [profile, setProfile] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    photo: '',
    nickName: '',
  });

  useAppStateGoBack(navigation);

  const [updateUser] = useUpdateUserMutation();
  const [isCorporate, setIsCorporate] = useState(false);

  useEffect(() => {
    if (data) {
      setProfile({
        id: data.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        photo: data.photo || '',
        nickName: data.nickName || '',
      });
    }
  }, [data]);

  const onChangeText = (field: string) => (value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateProfile = async () => {
    try {
      dispatch(
        updateUserProfile({
          ...profile,
        }),
      );

      await updateUser({
        accessToken,
        ...profile,
      }).unwrap();

      navigation.goBack();
    } catch (error) { }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size='large' color='#0000ff' />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        label='First Name'
        value={profile?.firstName}
        onChangeText={onChangeText('firstName')}
        mode='outlined'
        style={styles.input}
      />
      <TextInput
        label='Last Name'
        value={profile?.lastName}
        onChangeText={onChangeText('lastName')}
        mode='outlined'
        style={styles.input}
      />
      <TextInput
        label='Email'
        value={profile?.email}
        disabled
        editable={false}
        mode='outlined'
        style={styles.input}
      />
      <TextInput
        label='Nick Name'
        value={profile?.nickName}
        onChangeText={onChangeText('nickName')}
        mode='outlined'
        style={styles.input}
      />
      {/* <TextInput label="Phone Number" value={profile?.lastName} onChangeText={onChangeText('phone')} mode="outlined" style={styles.input} /> */}

      <View style={styles.checkboxRow}>
        <Checkbox
          status={isCorporate ? 'checked' : 'unchecked'}
          onPress={() => setIsCorporate(!isCorporate)}
        />
        <Text style={styles.checkText}>
          I want to be informed about opportunities for workplace shopping.
        </Text>
      </View>

      <Button
        mode='contained'
        onPress={handleUpdateProfile}
        style={styles.updateButton}
      >
        Update
      </Button>
    </ScrollView>
  );
};

export default ProfileDetailScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  greenTitle: {
    color: '#fff',
    backgroundColor: '#28a745',
    padding: 8,
    borderRadius: 4,
  },
  orangeText: {
    color: '#e67e22',
    marginBottom: 10,
  },
  inputBox: {
    marginVertical: 10,
    backgroundColor: '#fffbea',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    flex: 0.48,
    marginBottom: 10,
  },
  input: {
    marginBottom: 10,
  },
  orangeButton: {
    backgroundColor: '#f39c12',
  },
  updateButton: {
    marginTop: 20,
  },
  infoBox: {
    backgroundColor: '#d4edda',
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    marginBottom: 10,
    fontSize: 16,
  },
  checkText: {
    width: '90%',
    paddingRight: 8,
  },
});
