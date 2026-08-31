import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { GoToButtonProps } from '../types/components/gotoButtonProps';
import { RootStackParamList } from '../types/screens/screens';

const GoToButton = ({ screenName, style }: GoToButtonProps) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const navigate = () => {
    if (!screenName) return;
    navigation.navigate(screenName as any);
  };

  const navigateRef = (name: keyof RootStackParamList) => {
    navigation.navigate(name as any);
  };

  return (
    <View style={[style]}>
      <Button title={`Go to ${screenName}`} onPress={navigate} />
      <Button
        title='Go to CreatePost'
        onPress={() => navigateRef('CreatePost')}
      />
    </View>
  );
};

export default GoToButton;

const styles = StyleSheet.create({});
