import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface RoutesTabBarProps {
  activeTab: 'all' | 'favorites';
  onTabChange: (tab: 'all' | 'favorites') => void;
  onNavigateToFavorites?: () => void;
  allCount: number;
  favoritesCount: number;
}

const RoutesTabBar: React.FC<RoutesTabBarProps> = ({
  activeTab,
  onTabChange,
  allCount,
  favoritesCount,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => onTabChange('all')}
          activeOpacity={0.7}
        >
          <Icon
            name='list'
            size={20}
            color={activeTab === 'all' ? '#2196F3' : '#666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'all' && styles.activeTabText,
            ]}
          >
            Own Roads
          </Text>
          <View
            style={[styles.badge, activeTab === 'all' && styles.activeBadge]}
          >
            <Text style={styles.badgeText}>{allCount}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => onTabChange('favorites')}
          activeOpacity={0.7}
        >
          <Icon
            name='favorite'
            size={20}
            color={activeTab === 'favorites' ? '#e91e63' : '#666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'favorites' && styles.activeTabText,
            ]}
          >
            Favorites
          </Text>
          <View
            style={[
              styles.badge,
              activeTab === 'favorites' && styles.activeBadgeFav,
            ]}
          >
            <Text style={styles.badgeText}>{favoritesCount}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  activeBadge: {
    backgroundColor: '#E3F2FD',
  },
  activeBadgeFav: {
    backgroundColor: '#FCE4EC',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2196F3',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
  },
  viewAllButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RoutesTabBar;
