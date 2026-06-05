import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FavoriteItem } from './FavoriteItem';
import { FavoriteSectionProps } from '../../../types/screens/mapScreenType';

export function FavoriteSection({
  section,
  isExpanded,
  onToggle,
  onItemPress,
  onRemove,
}: FavoriteSectionProps) {
  const isEmpty = section.data.length === 0;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.sectionTitleContainer}>
          <Icon name={section.icon} size={22} color='#2196F3' />
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{section.data.length}</Text>
          </View>
        </View>
        <Icon
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={24}
          color='#666'
        />
      </TouchableOpacity>

      {isExpanded && !isEmpty && (
        <FlatList
          data={section.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FavoriteItem
              item={item}
              onPress={() => onItemPress(item)}
              onRemove={() => onRemove(item)}
            />
          )}
          scrollEnabled={false}
        />
      )}

      {isExpanded && isEmpty && (
        <View style={styles.emptyState}>
          <Icon name='folder-open' size={40} color='#ccc' />
          <Text style={styles.emptyText}>No items yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 12,
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#2196F3' },
  emptyState: {
    paddingVertical: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { marginTop: 10, fontSize: 14, color: '#999' },
});
