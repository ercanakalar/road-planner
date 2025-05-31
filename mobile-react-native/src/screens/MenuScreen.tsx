import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

import { NavigationProp } from '@react-navigation/native';

const MenuScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
  return (
    <View style={styles.container}>
      <Button title="Profile" onPress={() => navigation.navigate('Profile')} />
      <Button title="Settings" onPress={() => navigation.navigate('Settings')} />
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