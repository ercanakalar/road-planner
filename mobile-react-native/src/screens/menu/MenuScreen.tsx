import React, { useCallback } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { logout, setUserId } from 'store/slices/authSlice';
import { useAppSelector } from 'store/hook';
import { useLogoutMutation } from 'store/services/authenticationService';

import localStorageService from 'services/localStorageService';
import jwtService from 'services/jwtService';

import { TokenType } from 'types/libs/auth';
import Container from 'components/Container';

const menuItems = [
  { title: 'Profile', screen: 'ProfileScreen' },
  { title: 'Settings', screen: 'SettingsScreen' },
];
const MenuScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
  const dispatch = useDispatch();
  const { accessToken, userId } = useAppSelector((state) => state.auth);
  const [logoutTrigger] = useLogoutMutation();

  useFocusEffect(
    useCallback(() => {
      const fetchAndSetUserId = async () => {
        if (userId) return
        const decoded: any = await jwtService.decodeToken();
        dispatch(setUserId(decoded?.userId));
      };
      fetchAndSetUserId();
    }, [dispatch, userId, accessToken])
  );

  const logoutUser = async () => {
    const accessToken = await localStorageService.getItem(TokenType.ACCESS_TOKEN);
    await logoutTrigger({ accessToken }).unwrap();
    dispatch(logout({}));
    navigation.navigate('Menu');
  }

  return (
    <Container>
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
          onPress={logoutUser}
        />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
});

export default MenuScreen;