import { StyleSheet, Text, View } from 'react-native';
import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import localStorageService from 'services/localStorageService';

const SettingsScreen = () => {
  useFocusEffect(
    useCallback(() => {
      const run = () => {
        localStorageService.removeItem('post');
      };
      run();
    }, [])
  );

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>SettingsScreen!</Text>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({});
