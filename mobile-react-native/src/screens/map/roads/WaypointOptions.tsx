import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { WaypointOptionsProps } from 'types/map-screen-type';

const WaypointOptions: React.FC<WaypointOptionsProps> = ({
  onOptionSelect,
  item,
}) => (
  <View style={styles.optionRow}>
    <TouchableOpacity
      style={styles.optionBtn}
      onPress={() => onOptionSelect('delete')}
    >
      <MaterialIcons name='delete' size={20} color='#c00' />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => onOptionSelect('favorite')}
      style={styles.optionBtn}
    >
      <Text style={styles.favoriteIcon}>
        33{item.favoriteWaypoints[0]?.id ? '⭐' : '☆'}
      </Text>
    </TouchableOpacity>
  </View>
);

export default WaypointOptions;

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'column',
    gap: 8,
    height: 'auto',
  },
  optionBtn: {
    alignItems: 'center',
  },
  optionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#333',
  },
  favoriteIcon: {
    fontSize: 18,
    color: '#FFD700',
  },
});
