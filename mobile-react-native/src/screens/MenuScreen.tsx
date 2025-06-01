import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import localStorageService from 'services/localStorageService';
import { logout } from 'store/slices/authSlice';
import { useDispatch } from 'react-redux';
import { useAppSelector } from 'store/hook';
import jwtService from 'services/jwtService';

const menuItems = [
  { title: 'Profile', screen: 'ProfileScreen' },
  { title: 'Sign In', screen: 'SignInScreen' },
  { title: 'Settings', screen: 'SettingsScreen' },
];
const MenuScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
  const dispatch = useDispatch();
  const data = useAppSelector((state) => state.auth);

  useFocusEffect(
    React.useCallback(() => {
      const checkToken = async () => {
        const isExpired = await jwtService.isTokenExpired();
        if (isExpired) {
          dispatch(logout(data));
        }
      };
      checkToken();
    }, [dispatch, data])
  );
  return (
    <View style={styles.container}>
      {menuItems.map(item => (
        <Button
          key={item.screen}
          title={item.title}
          onPress={() => navigation.navigate(item.screen)}
        />
      ))}
      <Button
        title="Logout"
        onPress={async () => {
          await localStorageService.removeItem('access_token');
          await localStorageService.removeItem('refresh_token');
          dispatch(logout(data));
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
});

export default MenuScreen;