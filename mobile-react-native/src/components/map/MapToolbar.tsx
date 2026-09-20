import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { useTranslation } from 'react-i18next';

interface Props {
  top: number;
  title: string;
  canSwitch: boolean;
  hasActiveRoute: boolean;
  onSwitch: () => void;
  onEditDetails: () => void;
  onNewRoute: () => void;
  onDeleteRoute: () => void;
  onImportFromGoogleMaps: () => void;
}

const MapToolbar = ({
  top,
  title,
  canSwitch,
  hasActiveRoute,
  onSwitch,
  onEditDetails,
  onNewRoute,
  onDeleteRoute,
  onImportFromGoogleMaps,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  return (
    <View style={[styles.toolbar, { top }]}>
      <Pressable
        style={styles.routeChip}
        onPress={canSwitch ? onSwitch : onEditDetails}
        accessibilityRole='button'
        accessibilityLabel={
          canSwitch
            ? t('actions.switchRoute')
            : t('mapUi.editRouteDetailsAccessibility')
        }
      >
        <Ionicons name='git-branch-outline' size={15} color={colors.primary} />
        <Text style={styles.routeChipText} numberOfLines={1}>
          {title}
        </Text>
        {canSwitch ? (
          <Ionicons name='chevron-down' size={14} color={colors.textMuted} />
        ) : null}
      </Pressable>

      <Pressable
        style={styles.iconChip}
        onPress={onNewRoute}
        accessibilityRole='button'
        accessibilityLabel={t('mapUi.newRouteAccessibility')}
      >
        <Ionicons name='add' size={18} color={colors.primary} />
      </Pressable>

      <Pressable
        style={styles.iconChip}
        onPress={onImportFromGoogleMaps}
        accessibilityRole='button'
        accessibilityLabel={t('mapUi.importAccessibility')}
      >
        <Ionicons name='link' size={16} color={colors.primary} />
      </Pressable>

      {hasActiveRoute ? (
        <>
          <Pressable
            style={styles.iconChip}
            onPress={onEditDetails}
            accessibilityRole='button'
            accessibilityLabel={t('mapUi.editDetailsAccessibility')}
          >
            <Ionicons name='create-outline' size={16} color={colors.primary} />
          </Pressable>

          <Pressable
            style={styles.iconChip}
            onPress={onDeleteRoute}
            accessibilityRole='button'
            accessibilityLabel={t('mapUi.deleteRouteAccessibility')}
          >
            <Ionicons name='trash-outline' size={16} color={colors.danger} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    toolbar: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    routeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: '65%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    routeChipText: {
      ...typography.label,
      color: colors.text,
      flexShrink: 1,
    },
    iconChip: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
  });

export default memo(MapToolbar);
