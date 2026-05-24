import React from 'react';
import { StyleSheet, View } from 'react-native';

const BottomSheetHandle = () => {
  return (
    <View style={styles.container}>
      <View style={styles.indicator} />
    </View>
  );
};

export default BottomSheetHandle;

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  indicator: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
});
