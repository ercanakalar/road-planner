import { Dimensions, StyleSheet, Text, View } from 'react-native';
import React, { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import GoToButton from '../components/GoToButton';

const screenHeight = Dimensions.get('screen');
const ProfileScreen = ({ navigation }: any) => {
  //   useEffect(() => {
  //     const unsubscribe = navigation.addListener('focus', () => {
  //       alert('Screen is focused');
  //       // The screen is focused
  //       // Call any action
  //     });

  //     // Return the function to unsubscribe from the event so it gets removed on unmount
  //     return unsubscribe;
  //   }, []);
  useFocusEffect(
    useCallback(() => {
      console.log('Screen was focused');
      // Do something when the screen is focused
      return () => {
        console.log('Screen was unfocused');
        // Do something when the screen is unfocused
        // Useful for cleanup functions
      };
    }, [])
  );
  return (
    <View style={styles.container}>
      <Text style={styles.textContainer}>ProfileScreen</Text>
      <GoToButton style={styles.textContainer} screenName='Home' />
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textContainer: {
    marginBottom: 100,
  },
});
