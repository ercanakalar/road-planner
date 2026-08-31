import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MapHeaderProps {
  title: string;
  onAddPress?: () => void;
}

const MapHeader: React.FC<MapHeaderProps> = ({ title, onAddPress }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {onAddPress && (
        <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
          <Icon name='plus' size={24} color='#fff' />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e91e63',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapHeader;
