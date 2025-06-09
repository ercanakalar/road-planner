import { View, StyleSheet } from 'react-native';
import React, { ReactNode } from 'react';

const Container = ({ children }: { children: ReactNode }) => {
  return (
    <View style={styles.topContainer}>
      <View
        style={{
          backgroundColor: 'gray',
          paddingTop: 50,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
      </View>
      {children}
    </View>
  );
};

export default Container;

const styles = StyleSheet.create({
  topContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
});
