import { JSX, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import OpenInGoogleMapsButton from 'components/map/OpenInGoogleMapsButton';
import TransportSelector from 'components/map/TransportSelector';
import StopCard from './StopCard';

import { spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { StopWithAddress } from 'types/map-screen-type';
import { TransportMode, StopOption } from 'types/transport-type';

interface StopListProps {
  stops: StopWithAddress[];
  selectedPair: string[];
  durations?: Partial<Record<TransportMode, number>>;
  transportMode: TransportMode;
  showFavoriteAction?: boolean;
  onTransportModeChange: (mode: TransportMode) => void;
  onToggleSelection: (id: string) => void;
  onOptionSelect: (option: StopOption, item: StopWithAddress) => void;
  onReorder: (params: { from: number; to: number }) => void;
  onReorderingChange?: (isReordering: boolean) => void;
}

const StopList = ({
  stops,
  selectedPair,
  durations,
  transportMode,
  showFavoriteAction = true,
  onTransportModeChange,
  onToggleSelection,
  onOptionSelect,
  onReorder,
  onReorderingChange,
}: StopListProps) => {
  const styles = useThemedStyles(createStyles);

  const handleDragBegin = useCallback(
    () => onReorderingChange?.(true),
    [onReorderingChange],
  );

  const handleDragEnd = useCallback(
    ({ from, to }: DragEndParams<StopWithAddress>) => {
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
    }: RenderItemParams<StopWithAddress>): JSX.Element => (
      <ScaleDecorator activeScale={1.02}>
        <StopCard
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

  const keyExtractor = useCallback((item: StopWithAddress) => item.id, []);

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
        {/* Planning happens here; the driving itself is handed to Google. */}
        <OpenInGoogleMapsButton stops={stops} mode={transportMode} />
      </View>
    ),
    [
      durations,
      onTransportModeChange,
      selectedPair.length,
      styles,
      transportMode,
      stops,
    ],
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
    [styles],
  );

  return (
    <DraggableFlatList
      data={stops}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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

export default StopList;
