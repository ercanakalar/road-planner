import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import React from 'react';

const InfoModal = () => {
  return (
    <TouchableOpacity
      style={[styles.button]}
      onPress={() => console.log('write')}
    >
      <Text style={[styles.buttonText, styles.createPostButtonText]}>Info</Text>
    </TouchableOpacity>
  );
};

export default InfoModal;

const styles = StyleSheet.create({
  button: {
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  createPostButtonText: {
    fontSize: 18,
  },
});
