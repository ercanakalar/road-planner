import { Text, View } from 'react-native';
import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from 'store/hook';
import { useValidateRefreshTokenMutation } from 'store/services/authenticationService';

import localStorageService from 'services/localStorageService';

import HomeScreen from 'screens/HomeScreen';
import SignInScreen from 'screens/auth/SignInScreen';
import MapScreen from 'screens/map/MapScreen';
import ChatScreen from 'screens/chat/ChatScreen';
import MenuScreen from 'screens/menu/MenuScreen';
import { TokenType } from 'types/libs/auth';

const Tab = createBottomTabNavigator();

const HomeTabNavigator = () => {
  const { isLoggedIn } = useAppSelector((state) => state.auth);
  const [validateRefreshToken] = useValidateRefreshTokenMutation();

  useEffect(() => {
    const checkRefreshToken = async () => {
      try {
        const refreshToken = await localStorageService.getItem(TokenType.REFRESH_TOKEN);
        const accessToken = await localStorageService.getItem(TokenType.ACCESS_TOKEN);
        await validateRefreshToken({ accessToken, refreshToken }).unwrap();
      } catch (error) {
        console.error('Invalid refresh token', error);
      }
    };

    checkRefreshToken();
  }, [validateRefreshToken]);

  return (
    <Tab.Navigator
      initialRouteName='Home'
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = '';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Map') {
            iconName = 'map-marker';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Menu') {
            iconName = 'menu';
          }

          return <Icon name={iconName} color={color} size={size} />;
        },
        tabBarActiveTintColor: '#e91e63',
        tabBarInactiveTintColor: '#000000',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingVertical: 10,
          height: 100,
        },
        tabBarLabelStyle: {
          paddingBottom: 8,
          fontSize: 12,
          fontWeight: 'bold',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name='Home'
        component={HomeScreen}
        options={{
          headerShown: true,
          tabBarLabel: 'Home',
          header: () => (
            <View
              style={{
                backgroundColor: 'gray',
                padding: 15,
                paddingTop: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: 'white' }}>Home</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name='Map'
        component={MapScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen
        name='Chat'
        component={ChatScreen}
        options={{
          headerShown: true,
          header: () => (
            <View
              style={{
                backgroundColor: 'gray',
                padding: 15,
                paddingTop: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: 'white' }}>Chat</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name='Menu'
        component={isLoggedIn ? MenuScreen : SignInScreen}
        options={{
          headerShown: true,
          header: () => (
            <View
              style={{
                backgroundColor: 'gray',
                padding: 15,
                paddingTop: 50,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: 'white' }}>Menu</Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default HomeTabNavigator;