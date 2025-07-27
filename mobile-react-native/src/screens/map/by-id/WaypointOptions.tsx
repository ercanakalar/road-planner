import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import {
  WaypointOptionsProps,
} from 'types/map-screen-type';

const WaypointOptions: React.FC<WaypointOptionsProps> = ({
  onOptionSelect,
}) => (
  <View style={styles.optionRow}>
    <TouchableOpacity
      style={styles.optionBtn}
      onPress={() => onOptionSelect('edit')}
    >
      <MaterialIcons name='edit' size={20} color='#333' />
      <Text style={styles.optionText}>Edit</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.optionBtn}
      onPress={() => onOptionSelect('departure')}
    >
      <MaterialIcons name='flag' size={20} color='#333' />
      <Text style={styles.optionText}>Set Departure</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.optionBtn}
      onPress={() => onOptionSelect('share')}
    >
      <MaterialIcons name='share' size={20} color='#333' />
      <Text style={styles.optionText}>Share</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.optionBtn}
      onPress={() => onOptionSelect('delete')}
    >
      <MaterialIcons name='delete' size={20} color='#c00' />
      <Text style={[styles.optionText, { color: '#c00' }]}>Delete</Text>
    </TouchableOpacity>
  </View>
);

export default WaypointOptions

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#2c7be5',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  index: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  addressWrap: { flex: 1 },
  address: { fontWeight: '600', color: '#111' },
  subAddress: { color: '#666' },
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  transportBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTransport: {
    backgroundColor: '#2c7be5',
  },
  transportText: { fontSize: 14 },
  activeText: { color: 'white' },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  privacyModeWrap: {
    marginBottom: 16,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  optionBtn: {
    alignItems: 'center',
  },
  optionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#333',
  },
});

