import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from 'theme';
import { WaypointWithAddress } from 'types/map-screen-type';
import { WaypointOption } from 'types/transport-type';

interface Props {
  item: WaypointWithAddress;
  showFavoriteAction?: boolean;
  onOptionSelect: (option: WaypointOption) => void;
}

const WaypointOptions = ({
  item,
  showFavoriteAction = true,
  onOptionSelect,
}: Props) => {
  const isFavorite = item.favoriteWaypoints.length > 0;

  const handleFavorite = useCallback(
    () => onOptionSelect('favorite'),
    [onOptionSelect],
  );
  const handleDelete = useCallback(
    () => onOptionSelect('delete'),
    [onOptionSelect],
  );

  return (
    <View style={styles.row}>
      {showFavoriteAction ? (
        <Pressable
          onPress={handleFavorite}
          hitSlop={8}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          accessibilityRole='button'
          accessibilityLabel={
            isFavorite ? 'Remove from favourites' : 'Add to favourites'
          }
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={isFavorite ? colors.warning : colors.textSubtle}
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={handleDelete}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole='button'
        accessibilityLabel='Delete waypoint'
      >
        <MaterialIcons
          name='delete-outline'
          size={20}
          color={colors.textSubtle}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
});

export default memo(WaypointOptions);
