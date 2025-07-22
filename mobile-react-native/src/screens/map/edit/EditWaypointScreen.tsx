import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { useUpdateRoadByIdMutation, useUpdateWaypointByRoadIdMutation } from 'store/services/roadService';
import { WaypointWithAddress } from 'types/map-screen-type';
import { useAppSelector } from 'store/hook';

type EditWaypointScreenRouteParams = {
  routeId: string;
  accessToken: string;
  waypoint: WaypointWithAddress;
};

const EditWaypointScreen = ({ navigation }: { navigation: NavigationProp<any> }) => {
  const route = useRoute<RouteProp<{ EditWaypointScreen: EditWaypointScreenRouteParams }, 'EditWaypointScreen'>>();
  const { routeId, accessToken, waypoint } = route.params;
  console.log(route.params);

  const [updateWaypointByRoadId] = useUpdateWaypointByRoadIdMutation();

  const [description, setDescription] = useState(waypoint?.description ?? '');

  const handleSave = async () => {
    try {
      await updateWaypointByRoadId({
        accessToken,
        routeId: waypoint.roadId,
        description,
        waypoints: [],
      }).unwrap();

      Alert.alert('Success', 'Waypoint updated!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Update failed.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Address:</Text>
      <Text style={styles.text}>{waypoint?.address?.address}</Text>

      <Text style={styles.label}>Description:</Text>
      {/* <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Enter description"
        style={styles.input}
      /> */}

      <Button title="Save" onPress={handleSave} />
    </View>
  );
};

export default EditWaypointScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 20,
  },
});
