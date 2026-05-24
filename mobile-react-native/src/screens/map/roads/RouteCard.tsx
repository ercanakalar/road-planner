import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { WaypointWithAddressAndId } from 'types/map-screen-type';

type Props = {
  item: WaypointWithAddressAndId;
  accessToken: string;
  onToggleFavorite: (item: WaypointWithAddressAndId) => void;
  onDelete: (roadId: string) => void;
  onView: (roadId: string) => void;
};

const RouteCard = ({ item, onToggleFavorite, onDelete, onView }: Props) => {
  return (
    <View style={styles.routeCard}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>
        <TouchableOpacity
          onPress={() => onToggleFavorite(item)}
          style={styles.favoriteButton}
        >
          <Text style={{ fontSize: 18 }}>22{item.isFavorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.desc}>{item.description}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={() => onView(item.id)}>
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF3B30' }]}
          onPress={() => onDelete(item.id)}
        >
          <Text style={styles.buttonText}>Delete 11</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default memo(RouteCard);

const styles = StyleSheet.create({
  routeCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  desc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
