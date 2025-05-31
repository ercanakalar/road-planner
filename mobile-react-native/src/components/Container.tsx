import { View, StyleSheet } from 'react-native';
import React, { ReactNode } from 'react';

const Container = ({ children }: { children: ReactNode }) => {
  return (
    <View style={styles.topContainer}>
      {children}
    </View>
  );
};

export default Container;

const styles = StyleSheet.create({
  topContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
});
