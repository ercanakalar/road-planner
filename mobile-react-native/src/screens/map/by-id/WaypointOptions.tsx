import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  WaypointOptionsProps,
  WaypointWithAddress,
} from 'types/map-screen-type';
import { transportModes } from 'constants/transportMods';
import {
  TransportMode,
  TransportSelectorProps,
  WaypointOption,
} from 'types/transport-type';

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
  </View>
);

const TransportSelector: React.FC<TransportSelectorProps> = ({
  selected,
  onChange,
}) => (
  <View style={styles.transportRow}>
    {transportModes.map((mode) => (
      <TouchableOpacity
        key={mode.key}
        style={[
          styles.transportBtn,
          selected === mode.key && styles.activeTransport,
        ]}
        onPress={() => onChange(mode.key)}
      >
        <Ionicons
          name={mode.icon}
          size={20}
          color={selected === mode.key ? 'white' : '#555'}
        />
        <Text
          style={[
            styles.transportText,
            selected === mode.key && styles.activeText,
          ]}
        >
          {mode.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

interface EnhancedRouteViewProps {
  waypoints: WaypointWithAddress[];
  onOptionSelect: (option: WaypointOption, waypointId: string) => void;
  selectedMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  onPairChange: (pair: any[]) => void;
}

const EnhancedRouteView: React.FC<EnhancedRouteViewProps> = ({
  waypoints,
  onOptionSelect,
  selectedMode,
  onModeChange,
  onPairChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPair, setSelectedPair] = useState<string[]>([]);

  const filteredWaypoints = waypoints?.filter((w) =>
    w.address.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelectedPair((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return prev.length < 2 ? [...prev, id] : [prev[1], id];
      }
    });
  };

  const isPairSelected = selectedPair.length === 2;

  useEffect(() => {
    if (isPairSelected) {
      const pair = waypoints?.filter((w) => selectedPair.includes(w.id));
      onPairChange(pair);
    } else {
      onPairChange([]);
    }
  }, [selectedPair]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
        {isPairSelected && (
          <View style={styles.privacyModeWrap}>
            <Text style={styles.privacyText}>Mode for selected pair:</Text>
            <TransportSelector
              selected={selectedMode}
              onChange={onModeChange}
            />
          </View>
        )}

        {!isPairSelected && (
          <TransportSelector selected={selectedMode} onChange={onModeChange} />
        )}

        <FlatList
          data={filteredWaypoints}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                selectedPair.includes(item.id) && styles.cardSelected,
              ]}
              onPress={() => toggleSelection(item.id)}
            >
              <View style={styles.row}>
                <Text style={styles.index}>{item.order}</Text>
                <View style={styles.addressWrap}>
                  <Text style={styles.address}>{item.address.address}</Text>
                  <Text style={styles.subAddress}>
                    {item.address.district}, {item.address.province}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onOptionSelect('favorite', item.id)}
                >
                  <Ionicons
                    name={item.favoriteWaypoint ? 'star' : 'star-outline'}
                    size={20}
                    color={item.favoriteWaypoint ? '#f5c518' : '#aaa'}
                  />
                </TouchableOpacity>
              </View>
              <WaypointOptions
                onOptionSelect={(opt) => onOptionSelect(opt, item.id)}
              />
            </TouchableOpacity>
          )}
        />
      </BottomSheetScrollView>
    </SafeAreaView>
  );
};

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
  optionRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionText: { color: '#444', fontSize: 13 },
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
});

export default EnhancedRouteView;
