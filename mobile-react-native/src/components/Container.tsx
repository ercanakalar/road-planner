import { View, StyleSheet } from 'react-native';
import React, { ReactNode } from 'react';

const Container = ({ children }: { children: ReactNode }) => {
  return (
    <View style={styles.topContainer}>
      <View style={styles.header}></View>
      {children}
    </View>
  );
};

export default Container;

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 36,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  topContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
});
