import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';

import DraggableList from 'components/DraggableList';
import { RouteProp, useRoute } from '@react-navigation/core';
import { RootStackParamList } from 'types/screens/screens';

type EditWaypointScreenProp = RouteProp<RootStackParamList, 'EditWaypointScreen'>;

const EditWaypointScreen = ({ navigation }: { navigation: any }) => {
  const route = useRoute<EditWaypointScreenProp>();
  const routeId = (route.params && 'routeId' in route.params) ? (route.params as { routeId: string }).routeId : '';
  const [latitude, setLatitude] = useState('39.957512');
  const [longitude, setLongitude] = useState('32.789962');

  const addWaypoint = () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (!isNaN(lat) && !isNaN(lon)) {
      const newWaypoint = { latitude: lat, longitude: lon };
      navigation.navigate('Map', { newWaypoint });
    } else {
      Alert.alert(
        'Invalid input',
        'Please enter valid latitude and longitude.'
      );
    }
  };
  return (
    <View style={styles.container}>
      <DraggableList routeId={routeId} />
      <View style={styles.addWaypointContainer}>
        <TextInput
          style={styles.input}
          placeholder='Latitude'
          value={latitude}
          onChangeText={setLatitude}
          keyboardType='numeric'
        />
        <TextInput
          style={styles.input}
          placeholder='Longitude'
          value={longitude}
          onChangeText={setLongitude}
          keyboardType='numeric'
        />
        <Button title='Add Waypoint' onPress={addWaypoint} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  addWaypointContainer: {
    marginBottom: 40,
  }
});

export default EditWaypointScreen;
