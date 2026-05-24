import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Favorite {
  id: string;
  name: string;
  type: 'road' | 'waypoint';
  owner: 'own' | 'others';
}

interface FavoriteDetailProps {
  route: any;
}

const FavoriteDetail: React.FC<FavoriteDetailProps> = ({ route }) => {
  const favorite: Favorite = route.params?.favorite;

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Icon
            name={favorite?.type === 'road' ? 'directions-car' : 'location-on'}
            size={48}
            color='#2196F3'
          />
          <Text style={styles.title}>{favorite?.name}</Text>
          <Text style={styles.type}>
            {favorite?.type === 'road' ? 'Road' : 'Waypoint'}
          </Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.label}>Owner</Text>
            <Text style={styles.value}>
              {favorite?.owner === 'own' ? 'My Favorite' : "Others' Favorite"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.label}>ID</Text>
            <Text style={styles.value}>{favorite?.id}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>
              {favorite?.type.charAt(0).toUpperCase() + favorite?.type.slice(1)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9f9f9' },
  container: { flex: 1, paddingHorizontal: 16 },
  header: { alignItems: 'center', paddingVertical: 30 },
  title: { fontSize: 24, fontWeight: '700', color: '#000', marginTop: 16 },
  type: { fontSize: 14, color: '#666', marginTop: 4 },
  details: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  detailItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 16, color: '#000', fontWeight: '500' },
});

export default FavoriteDetail;
