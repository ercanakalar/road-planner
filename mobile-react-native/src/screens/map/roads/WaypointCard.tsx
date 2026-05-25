import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import WaypointOptions from 'screens/map/roads/WaypointOptions';
import { WaypointWithAddress } from 'types/map-screen-type';
import { WaypointOption } from 'types/transport-type';

type WaypointCardProps = {
  item: WaypointWithAddress;
  isActive: boolean;
  drag: () => void;
  selectedPair: string[];
  toggleSelection: (id: string) => void;
  handleOptionSelect: (option: WaypointOption, item: WaypointWithAddress) => void;
};

const WaypointCard: React.FC<WaypointCardProps> = ({
  item,
  isActive,
  drag,
  selectedPair,
  toggleSelection,
  handleOptionSelect,
}) => {
  return (
    <Pressable
      onLongPress={drag}
      disabled={isActive}
      key={item.id}
      style={[
        styles.card,
        isActive && styles.cardActive,
        selectedPair.includes(item.id) && styles.cardSelected,
      ]}
      onPress={() => toggleSelection(item.id)}
    >
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.order}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.address?.address}</Text>
          <Text style={styles.subtitle}>
            {item.address?.district}, {item.address?.province}
          </Text>
        </View>
        <WaypointOptions
          onOptionSelect={(opt) => handleOptionSelect(opt, item)}
          item={item}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
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
  title: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1e1e1e',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
  },
  badge: {
    width: 28,
    height: 28,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cardActive: {
    backgroundColor: '#e6f7ff',
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
  },
});

export default WaypointCard;