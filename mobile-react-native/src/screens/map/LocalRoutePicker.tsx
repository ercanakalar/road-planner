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
import { LocalRoute } from 'types/local-route';

interface Props {
  visible: boolean;
  routes: LocalRoute[];
  activeRouteId?: string;
  onSelect: (routeId: string) => void;
  onClose: () => void;
}

const Row = memo(
  ({
    route,
    isActive,
    onSelect,
  }: {
    route: LocalRoute;
    isActive: boolean;
    onSelect: (routeId: string) => void;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const handlePress = useCallback(
      () => onSelect(route.id),
      [onSelect, route.id],
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
            {route.title}
          </Text>
          <Text style={styles.rowMeta}>
            {route.stops.length} stop{route.stops.length === 1 ? '' : 's'}
          </Text>
        </View>

        {isActive ? (
          <Ionicons name='checkmark' size={18} color={colors.primary} />
        ) : null}
      </Pressable>
    );
  },
);

Row.displayName = 'LocalRoutePickerRow';

const LocalRoutePicker = ({
  visible,
  routes,
  activeRouteId,
  onSelect,
  onClose,
}: Props) => {
  const styles = useThemedStyles(createStyles);

  const renderItem = useCallback(
    ({ item }: { item: LocalRoute }) => (
      <Row
        route={item}
        isActive={item.id === activeRouteId}
        onSelect={onSelect}
      />
    ),
    [activeRouteId, onSelect],
  );

  const keyExtractor = useCallback((item: LocalRoute) => item.id, []);

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
            data={routes}
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

export default memo(LocalRoutePicker);
