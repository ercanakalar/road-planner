import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { useAppDispatch, useAppSelector } from 'store/hook';
import { useLogoutMutation } from 'store/services/authenticationService';
import { useGetUserQuery } from 'store/services/profileService';
import { logout } from 'store/slices/authSlice';
import { updateUserProfile } from 'store/slices/userSlice';
import { useAppStateRefetch } from 'hooks/useAppStateRefresh';
import { UserProfile } from 'types/screens/profileScreenType';
import { ProfileScreenProps } from 'types/screens/profileScreenType';

const FALLBACK_AVATAR = 'https://i.pravatar.cc/150?img=12';


const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  const dispatch = useAppDispatch();
  const { accessToken, userId } = useAppSelector((state) => state.auth);

  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutTrigger, { isLoading: isLoggingOut }] = useLogoutMutation();

  const { data, isLoading, refetch } = useGetUserQuery(
    { userId, accessToken },
    { skip: !accessToken || !userId },
  ) as { data?: UserProfile; isLoading: boolean; refetch: () => void };

  useAppStateRefetch(refetch);

  useEffect(() => {
    if (!data) return;
    dispatch(updateUserProfile({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      photo: data.photo,
      nickName: data.nickName,
    }));
  }, [data, dispatch]);

  const handleLogout = useCallback(() => setLogoutModalVisible(true), []);
  const cancelLogout = useCallback(() => setLogoutModalVisible(false), []);

  const confirmLogout = useCallback(async () => {
    setLogoutModalVisible(false);
    try {
      await logoutTrigger({ accessToken }).unwrap();
    } catch {
    } finally {
      dispatch(logout(undefined));
      navigation.reset({ index: 0, routes: [{ name: 'HomeTabNavigator' }] });
    }
  }, [accessToken, logoutTrigger, dispatch, navigation]);

  const goToProfile = useCallback(
    () => {
      if (accessToken && userId) {
        navigation.navigate('ProfileDetailScreen', { accessToken, userId });
      }
    },
    [navigation, accessToken, userId],
  );

  const goToSettings = useCallback(
    () => navigation.navigate('SettingsScreen'),
    [navigation],
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: data?.photo || FALLBACK_AVATAR }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{data?.firstName} {data?.lastName}</Text>
        <Text style={styles.email}>{data?.email}</Text>
      </View>

      <TouchableOpacity style={styles.card} onPress={goToProfile}>
        <Icon name="user" size={22} color="#007BFF" />
        <Text style={styles.cardText}>Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={goToSettings}>
        <Icon name="cog" size={22} color="#007BFF" />
        <Text style={styles.cardText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.logoutCard]}
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        <Icon name="sign-out" size={22} color="#FF3B30" />
        <Text style={[styles.cardText, styles.logoutText]}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={isLogoutModalVisible}
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={cancelLogout}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={confirmLogout}>
                <Text style={styles.confirmText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default React.memo(ProfileScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 40 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4F8', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  cardText: { fontSize: 16, marginLeft: 12, color: '#333' },
  logoutCard: { backgroundColor: '#FFE6E6' },
  logoutText: { color: '#FF3B30' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '80%', backgroundColor: '#FFF', padding: 20, borderRadius: 10, elevation: 5 },
  modalText: { fontSize: 16, marginBottom: 20, color: '#333', textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { padding: 10, backgroundColor: '#ccc', borderRadius: 8, width: '45%', alignItems: 'center' },
  confirmButton: { padding: 10, backgroundColor: '#FF3B30', borderRadius: 8, width: '45%', alignItems: 'center' },
  cancelText: { color: '#333', fontWeight: 'bold' },
  confirmText: { color: '#FFF', fontWeight: 'bold' },
});