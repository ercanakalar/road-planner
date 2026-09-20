import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import useAreaSummary from 'hooks/travel/useAreaSummary';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { MarkedArea } from 'types/travel-map';

interface Props {
  areas: MarkedArea[];
  onPress: () => void;
}

const TravelMapCard = ({ areas, onPress }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const summary = useAreaSummary(areas);

  const subtitle = areas.length
    ? t('travelMap.colouredIn', {
        summary: summary || t('travelMap.places', { count: areas.length }),
      })
    : t('travelMap.invitation');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={`${t('travelMap.title')}. ${subtitle}.`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name='earth' size={20} color={colors.primary} />
      </View>

      <View style={styles.headings}>
        <Text style={styles.title}>{t('travelMap.title')}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <Ionicons name='chevron-forward' size={18} color={colors.textSubtle} />
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.sm,
    },
    pressed: { backgroundColor: colors.surfaceAlt },
    icon: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headings: { flex: 1, gap: spacing.xxs },
    title: {
      ...typography.heading,
      color: colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
    },
  });

export default memo(TravelMapCard);
