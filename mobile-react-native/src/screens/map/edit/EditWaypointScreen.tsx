import React from 'react';
import { View, StyleSheet } from 'react-native';

import DraggableList from 'components/DraggableList';
import { useRoute } from '@react-navigation/core';
import { EditWaypointScreenProp } from 'types/map-screen-type';

const EditWaypointScreen = ({ navigation }: { navigation: any }) => {
  const route = useRoute<EditWaypointScreenProp>();
  const routeId =
    route.params && 'routeId' in route.params
      ? (route.params as { routeId: string }).routeId
      : '';

  return (
    <View style={styles.container}>
      <DraggableList routeId={routeId} />
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
  },
});

export default EditWaypointScreen;
