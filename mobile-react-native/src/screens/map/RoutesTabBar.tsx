import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from 'theme';

export type RoutesTab = 'all' | 'favorites';

interface RoutesTabBarProps {
  activeTab: RoutesTab;
  onTabChange: (tab: RoutesTab) => void;
  allCount: number;
  favoritesCount: number;
}

interface TabButtonProps {
  tab: RoutesTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  isActive: boolean;
  onPress: (tab: RoutesTab) => void;
}

const TabButton = memo(
  ({ tab, label, icon, count, isActive, onPress }: TabButtonProps) => {
    const handlePress = useCallback(() => onPress(tab), [onPress, tab]);

    return (
      <Pressable
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={handlePress}
        accessibilityRole='tab'
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${label}, ${count} item${count === 1 ? '' : 's'}`}
      >
        <Ionicons
          name={icon}
          size={17}
          color={isActive ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
        <View style={[styles.badge, isActive && styles.activeBadge]}>
          <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
            {count}
          </Text>
        </View>
      </Pressable>
    );
  },
);

TabButton.displayName = 'TabButton';

const RoutesTabBar = ({
  activeTab,
  onTabChange,
  allCount,
  favoritesCount,
}: RoutesTabBarProps) => (
  <View style={styles.container}>
    <View style={styles.tabsContainer} accessibilityRole='tablist'>
      <TabButton
        tab='all'
        label='My routes'
        icon='map-outline'
        count={allCount}
        isActive={activeTab === 'all'}
        onPress={onTabChange}
      />
      <TabButton
        tab='favorites'
        label='Favourites'
        icon='star-outline'
        count={favoritesCount}
        isActive={activeTab === 'favorites'}
        onPress={onTabChange}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  activeTab: {
    backgroundColor: colors.surface,
  },
  tabText: {
    ...typography.label,
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.text,
  },
  badge: {
    minWidth: 22,
    alignItems: 'center',
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  activeBadge: {
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  activeBadgeText: {
    color: colors.primary,
  },
});

export default memo(RoutesTabBar);
