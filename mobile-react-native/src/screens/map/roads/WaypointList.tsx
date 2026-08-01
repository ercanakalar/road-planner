import React, { JSX, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import TransportSelector from 'components/TransportSelector';
import WaypointCard from './WaypointCard';

import { colors, spacing, typography } from 'theme';
import { WaypointWithAddress } from 'types/map-screen-type';
import { TransportMode, WaypointOption } from 'types/transport-type';

export interface WaypointListProps {
  waypoints: WaypointWithAddress[];
  selectedPair: string[];
  durations?: Partial<Record<TransportMode, number>>;
  transportMode: TransportMode;
  showFavoriteAction?: boolean;
  onTransportModeChange: (mode: TransportMode) => void;
  onToggleSelection: (id: string) => void;
  onOptionSelect: (option: WaypointOption, item: WaypointWithAddress) => void;
  onReorder: (params: { from: number; to: number }) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}

const WaypointList = ({
  waypoints,
  selectedPair,
  durations,
  transportMode,
  showFavoriteAction = true,
  onTransportModeChange,
  onToggleSelection,
  onOptionSelect,
  onReorder,
  onReorderingChange,
}: WaypointListProps) => {
  const handleDragBegin = useCallback(
    () => onReorderingChange?.(true),
    [onReorderingChange],
  );

  const handleDragEnd = useCallback(
    ({ from, to }: DragEndParams<WaypointWithAddress>) => {
      onReorderingChange?.(false);
      if (from === to) return;
      onReorder({ from, to });
    },
    [onReorder, onReorderingChange],
  );

  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: RenderItemParams<WaypointWithAddress>): JSX.Element => (
      <ScaleDecorator activeScale={1.02}>
        <WaypointCard
          item={item}
          drag={drag}
          isActive={isActive}
          isSelected={selectedPair.includes(item.id)}
          selectionIndex={selectedPair.indexOf(item.id)}
          showFavoriteAction={showFavoriteAction}
          onToggleSelection={onToggleSelection}
          onOptionSelect={onOptionSelect}
        />
      </ScaleDecorator>
    ),
    [onOptionSelect, onToggleSelection, selectedPair, showFavoriteAction],
  );

  const keyExtractor = useCallback((item: WaypointWithAddress) => item.id, []);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedPair.length === 2 ? 'Selected leg' : 'Whole route'}
        </Text>
        <Text style={styles.headerHint}>
          {selectedPair.length === 2
            ? 'Tap the highlighted stops again to clear'
            : 'Tap two stops to compare a single leg'}
        </Text>
        <TransportSelector
          selected={transportMode}
          onChange={onTransportModeChange}
          durations={durations}
        />
      </View>
    ),
    [durations, onTransportModeChange, selectedPair.length, transportMode],
  );

  const empty = useMemo(
    () => (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No stops yet</Text>
        <Text style={styles.emptyHint}>
          Long press anywhere on the map to add the first one.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <DraggableFlatList
      data={waypoints}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onDragBegin={handleDragBegin}
      onDragEnd={handleDragEnd}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={styles.listContent}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews={false}
      activationDistance={12}
    />
  );
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text,
  },
  headerHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.text,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default WaypointList;
