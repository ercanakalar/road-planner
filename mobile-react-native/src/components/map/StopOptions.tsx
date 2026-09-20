import { memo, useCallback, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ContextMenu from 'components/ui/ContextMenu';
import { radius, spacing, useTheme, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { ContextMenuOption } from 'types/components/contextMenu';
import { StopWithAddress } from 'types/map-screen-type';
import { StopOption } from 'types/transport-type';
import { addressName, fullAddress } from 'utils/address';
import { useTranslation } from 'react-i18next';

interface Props {
  item: StopWithAddress;
  showFavoriteAction?: boolean;
  onOptionSelect: (option: StopOption) => void;
}

const StopOptions = ({
  item,
  showFavoriteAction = true,
  onOptionSelect,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const isFavorite = item.favoriteStops.length > 0;
  const hasAddress = fullAddress(item.address).length > 0;

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const options = useMemo(() => {
    const rows: ContextMenuOption[] = [];

    if (showFavoriteAction) {
      rows.push({
        label: isFavorite
          ? t('mapUi.removeFromFavourites')
          : t('mapUi.addToFavourites'),
        icon: isFavorite ? 'heart' : 'heart-outline',
        action: () => onOptionSelect('favorite'),
      });
    }

    if (hasAddress) {
      rows.push({
        label: t('mapUi.copyAddress'),
        icon: 'copy-outline',
        action: () => onOptionSelect('copy'),
      });
    }

    rows.push({
      label: t('mapUi.deleteStop'),
      icon: 'trash-outline',
      tone: 'danger',
      action: () => onOptionSelect('delete'),
    });

    return rows;
  }, [hasAddress, isFavorite, onOptionSelect, showFavoriteAction, t]);

  return (
    <View>
      <Pressable
        onPress={open}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole='button'
        accessibilityLabel={`Options for ${
          addressName(item.address) || `stop ${item.order}`
        }`}
      >
        <Ionicons
          name='ellipsis-vertical'
          size={20}
          color={isFavorite ? colors.warning : colors.textSubtle}
        />
      </Pressable>

      <ContextMenu
        visible={isOpen}
        title={addressName(item.address) || 'Stop'}
        options={options}
        onClose={close}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      padding: spacing.sm,
      borderRadius: radius.sm,
    },
    pressed: {
      backgroundColor: colors.surfaceAlt,
    },
  });

export default memo(StopOptions);
