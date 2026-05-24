import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import appConfig from 'constants/appConfig';

const REACT_APP_MAP_API_KEY = appConfig.mapApiKey;

const PlacesSearchBar = ({
  onPlaceSelected,
  onLayoutChange,
}: {
  onPlaceSelected: (
    location: { lat: number; lng: number },
    address: string,
  ) => void;
  onLayoutChange?: (bottom: number) => void;
}) => {
  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = async (text: string) => {
    setInput(text);
    if (!text) {
      setPredictions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text,
        )}&key=${REACT_APP_MAP_API_KEY}`,
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
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${REACT_APP_MAP_API_KEY}`,
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

  const clearInput = () => {
    setInput('');
    setPredictions([]);
    inputRef.current?.focus();
  };

  return (
    <View
      style={styles.container}
      onLayout={(e: LayoutChangeEvent) => {
        const { y, height } = e.nativeEvent.layout;
        onLayoutChange?.(y + height);
      }}
    >
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          placeholder='Search here...'
          value={input}
          onChangeText={handleSearch}
          style={styles.input}
        />
        {input.length > 0 && (
          <TouchableOpacity onPress={clearInput} style={styles.clearBtn}>
            <Ionicons name='close-circle' size={20} color='#999' />
          </TouchableOpacity>
        )}
      </View>

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
    top: 5,
    left: 16,
    right: 16,
    zIndex: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  clearBtn: {
    padding: 4,
  },
  results: {
    marginTop: 4,
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
