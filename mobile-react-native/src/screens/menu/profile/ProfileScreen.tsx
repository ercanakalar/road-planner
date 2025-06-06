import { StyleSheet, View, ScrollView, AppState, AppStateStatus, ActivityIndicator } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { TextInput, Button, Checkbox, Text } from 'react-native-paper';

import { useGetUserQuery, useUpdateUserMutation } from 'store/services/profileService';
import { useAppDispatch, useAppSelector } from 'store/hook';
import { setUserId } from 'store/slices/authSlice';

import jwtService from 'services/jwtService';

import { UserProfile } from 'types/screens/profileScreenType';
import { showNotification } from 'services/notificationService';

const ProfileScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
  const dispatch = useAppDispatch();
  const { accessToken, userId } = useAppSelector((state) => state.auth);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    photo: '',
    nickName: '',
  });

  const [updateUser] = useUpdateUserMutation();

  const { data, isLoading, error, refetch } = useGetUserQuery(
    { userId, token: accessToken },
    { skip: !userId }
  ) as { data?: UserProfile; isLoading: boolean; error: any; refetch: () => void };
  const [isCorporate, setIsCorporate] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchAndSetUserId = async () => {
        if (!userId) {
          const decoded: any = await jwtService.decodeToken();
          dispatch(setUserId(decoded?.userId));
        }
      };
      refetch();
      fetchAndSetUserId();
      return () => {
        console.log('Screen was unfocused');
      };
    }, [userId, accessToken])
  );

  useEffect(() => {
    if (data) {
      setProfile({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        photo: data.photo || '',
        nickName: data.nickName || '',
      });
    }
  }, [data]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refetch();
      }
      setAppState(nextAppState);
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [appState]);

  const onChangeText = (field: keyof UserProfile) => (value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateProfile = async () => {
    try {
      await updateUser({
        accessToken,
        profile: {
          ...profile,
          id: userId,
        },
      }).unwrap()
      showNotification({
        type: 'success',
        text1: 'Profile updated successfully',
        text2: 'Your profile has been updated.',
        visibilityTime: 3000,
        position: 'top',
        topOffset: 50,
      })
      navigation.goBack();
    } catch (error) {
      showNotification({
        type: 'error',
        text1: 'Profile update failed',
        text2: 'Please try again later.',
        visibilityTime: 3000,
        position: 'top',
      })
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.textContainer}>Failed to load profile. Please try again.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput label="First Name" value={profile?.firstName} onChangeText={onChangeText('firstName')} mode="outlined" style={styles.input} />
      <TextInput label="Last Name" value={profile?.lastName} onChangeText={onChangeText('lastName')} mode="outlined" style={styles.input} />
      <TextInput label="Email" value={profile?.email} disabled editable={false} mode="outlined" style={styles.input} />
      <TextInput label="Nick Name" value={profile?.nickName} onChangeText={onChangeText('nickName')} mode="outlined" style={styles.input} />
      {/* <TextInput label="Phone Number" value={profile?.lastName} onChangeText={onChangeText('phone')} mode="outlined" style={styles.input} /> */}

      <View style={styles.checkboxRow}>
        <Checkbox
          status={isCorporate ? 'checked' : 'unchecked'}
          onPress={() => setIsCorporate(!isCorporate)}
        />
        <Text style={styles.checkText}>I want to be informed about opportunities for workplace shopping.</Text>
      </View>

      <Button
        mode="contained"
        onPress={handleUpdateProfile}
        style={styles.updateButton}
      >
        Update
      </Button>
    </ScrollView>
  );
};

export default ProfileScreen;

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