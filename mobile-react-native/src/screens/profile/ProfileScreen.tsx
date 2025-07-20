import React, { useEffect, useState } from 'react';
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
import { useDispatch } from 'react-redux';
import { useAppSelector } from 'store/hook';
import { useLogoutMutation } from 'store/services/authenticationService';
import { logout } from 'store/slices/authSlice';
import localStorageService from 'services/localStorageService';
import { TokenType } from 'types/libs/auth';
import { useGetUserQuery } from 'store/services/profileService';
import { UserProfile } from 'types/screens/profileScreenType';
import { updateUserProfile } from 'store/slices/userSlice';
import { useAppStateRefetch } from 'hooks/useAppStateRefresh';

const ProfileScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const dispatch = useDispatch();
  const { accessToken, userId } = useAppSelector((state) => state.auth);
  const [logoutTrigger] = useLogoutMutation();

  const { data, isLoading, refetch } = useGetUserQuery(
    { userId, token: accessToken },
  ) as {
    data?: UserProfile;
    isLoading: boolean;
    error: any;
    refetch: () => void;
  }

  useAppStateRefetch(refetch)

  useEffect(() => {
    if (data) {
      dispatch(updateUserProfile({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        photo: data.photo,
        nickName: data.nickName,
      }));
    }
  }
    , [data, dispatch]);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const handleLogout = () => setLogoutModalVisible(true);
  const cancelLogout = () => setLogoutModalVisible(false);

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    const token = await localStorageService.getItem(TokenType.ACCESS_TOKEN);
    await logoutTrigger({ accessToken: token }).unwrap();
    dispatch(logout({}));
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const goToProfile = () => navigation.navigate('ProfileDetailScreen', {
    accessToken,
    userId
  });
  const goToSettings = () => navigation.navigate('SettingsScreen');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: data?.photo !== "" ? data?.photo : 'https://i.pravatar.cc/150?img=12' }}
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

      <TouchableOpacity style={[styles.card, styles.logoutCard]} onPress={handleLogout}>
        <Icon name="sign-out" size={22} color="#FF3B30" />
        <Text style={[styles.cardText, styles.logoutText]}>Logout</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>Are you sure you want to logout?</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cardText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  logoutCard: {
    backgroundColor: '#FFE6E6',
  },
  logoutText: {
    color: '#FF3B30',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 10,
    backgroundColor: '#ccc',
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  confirmButton: {
    padding: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  cancelText: {
    color: '#333',
    fontWeight: 'bold',
  },
  confirmText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
