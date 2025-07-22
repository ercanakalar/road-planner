import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WaypointWithAddress } from 'types/map-screen-type';

type Props = {
  wp: WaypointWithAddress;
  order: number;
  onEdit?: () => void;
  onDelete?: () => void;
};

const WaypointCard = ({ wp, order, onEdit, onDelete }: Props) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {order}. {wp.address?.address}
      </Text>
      <Text style={styles.cardText}>
        {wp.address?.district}, {wp.address?.province}
      </Text>
      <Text style={styles.cardText}>
        📍 {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit} style={styles.button}>
          <Text>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.button}>
          <Text>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WaypointCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardText: {
    fontSize: 14,
    color: '#555',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  button: {
    padding: 4,
  },
});
