import { memo, useCallback } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { LocalRoad } from 'types/local-road';

interface Props {
  visible: boolean;
  roads: LocalRoad[];
  activeRoadId?: string;
  onSelect: (roadId: string) => void;
  onClose: () => void;
}

const Row = memo(
  ({
    road,
    isActive,
    onSelect,
  }: {
    road: LocalRoad;
    isActive: boolean;
    onSelect: (roadId: string) => void;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const handlePress = useCallback(
      () => onSelect(road.id),
      [onSelect, road.id],
    );

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={handlePress}
        accessibilityRole='button'
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {road.title}
          </Text>
          <Text style={styles.rowMeta}>
            {road.wayPoints.length} stop{road.wayPoints.length === 1 ? '' : 's'}
          </Text>
        </View>

        {isActive ? (
          <Ionicons name='checkmark' size={18} color={colors.primary} />
        ) : null}
      </Pressable>
    );
  },
);

Row.displayName = 'LocalRoadPickerRow';

const LocalRoadPicker = ({
  visible,
  roads,
  activeRoadId,
  onSelect,
  onClose,
}: Props) => {
  const styles = useThemedStyles(createStyles);

  const renderItem = useCallback(
    ({ item }: { item: LocalRoad }) => (
      <Row
        road={item}
        isActive={item.id === activeRoadId}
        onSelect={onSelect}
      />
    ),
    [activeRoadId, onSelect],
  );

  const keyExtractor = useCallback((item: LocalRoad) => item.id, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={swallowPress}>
          <Text style={styles.heading}>Switch route</Text>

          <FlatList
            data={roads}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={styles.list}
            keyboardShouldPersistTaps='handled'
          />

          <Pressable
            style={styles.cancel}
            onPress={onClose}
            accessibilityRole='button'
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const swallowPress = () => {};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
      padding: spacing.lg,
    },
    sheet: {
      maxHeight: '70%',
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      paddingVertical: spacing.sm,
      ...shadows.lg,
    },
    heading: {
      ...typography.label,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
    list: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    rowText: { flex: 1, gap: 2 },
    rowTitle: {
      ...typography.body,
      color: colors.text,
    },
    rowMeta: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
    },
    cancel: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    cancelText: {
      ...typography.body,
      color: colors.textMuted,
    },
  });

export default memo(LocalRoadPicker);
