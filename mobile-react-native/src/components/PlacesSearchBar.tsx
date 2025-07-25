import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import appConfig from 'constants/appConfig';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const PlacesSearchBar = ({
  onPlaceSelected,
}: {
  onPlaceSelected: (
    location: { lat: number; lng: number },
    address: string
  ) => void;
}) => {
  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);

  const handleSearch = async (text: string) => {
    setInput(text);
    if (!text) {
      setPredictions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&key=${REACT_APP_MAP_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK') {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${REACT_APP_MAP_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        onPlaceSelected({ lat, lng }, description);
        setPredictions([]);
        setInput(description);
      }
    } catch (error) {
      console.error('Place details error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder='Search here...'
        value={input}
        onChangeText={handleSearch}
        style={styles.input}
      />
      <FlatList
        data={predictions}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelect(item.place_id, item.description)}
          >
            <Text style={styles.resultItem}>{item.description}</Text>
          </TouchableOpacity>
        )}
        style={styles.results}
        keyboardShouldPersistTaps='handled'
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    elevation: 5,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 16,
  },
  results: {
    marginTop: 2,
  },
  resultItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 15,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
});

export default PlacesSearchBar;
