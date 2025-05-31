import { StyleSheet, Text, View } from 'react-native';
import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { deleteStorage } from '../utils/localStorage';

const SettingsScreen = () => {
  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        await deleteStorage('post');
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
