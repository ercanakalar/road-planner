import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import PrimaryButton from 'components/ui/PrimaryButton';
import {
  areaColor,
  AREA_KIND_ICON,
  AREA_KIND_LABEL,
} from 'constants/travelMap';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { MapArea } from 'types/travel-map';
import { withAlpha } from 'utils/color';

const CHIP_TINT = 0.14;

interface Props {
  candidates: readonly MapArea[];
  selectedIndex: number;
  isMarked: boolean;
  onChoose: (index: number) => void;
  onMark: () => void;
  onRemove: () => void;
  onDismiss: () => void;
}

const AreaPickerCard = ({
  candidates,
  selectedIndex,
  isMarked,
  onChoose,
  onMark,
  onRemove,
  onDismiss,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const selected = candidates[selectedIndex];
  if (!selected) return null;

  const tint = areaColor(colors, selected.kind);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: withAlpha(tint, 0.16) }]}>
          <Ionicons
            name={AREA_KIND_ICON[selected.kind]}
            size={18}
            color={tint}
          />
        </View>

        <View style={styles.headings}>
          <Text style={styles.name} numberOfLines={1}>
            {selected.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {t(AREA_KIND_LABEL[selected.kind])} · {selected.address}
          </Text>
        </View>

        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole='button'
          accessibilityLabel={t('travelMap.dismiss')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Ionicons name='close' size={20} color={colors.textSubtle} />
        </Pressable>
      </View>

      {candidates.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps='handled'
        >
          {candidates.map((candidate, index) => {
            const isSelected = index === selectedIndex;
            const chipTint = areaColor(colors, candidate.kind);

            return (
              <Pressable
                key={candidate.placeId}
                onPress={() => onChoose(index)}
                accessibilityRole='button'
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={t('travelMap.alsoHere', {
                  name: candidate.name,
                  kind: t(AREA_KIND_LABEL[candidate.kind]).toLowerCase(),
                })}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && {
                    backgroundColor: withAlpha(chipTint, CHIP_TINT),
                    borderColor: chipTint,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={AREA_KIND_ICON[candidate.kind]}
                  size={13}
                  color={isSelected ? chipTint : colors.textMuted}
                />
                <Text
                  style={[styles.chipText, isSelected && { color: colors.text }]}
                  numberOfLines={1}
                >
                  {candidate.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {isMarked ? (
        <PrimaryButton
          label={t('travelMap.unmarkIt')}
          variant='secondary'
          onPress={onRemove}
        />
      ) : (
        <PrimaryButton label={t('travelMap.markIt')} onPress={onMark} />
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      ...shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headings: { flex: 1, gap: spacing.xxs },
    name: {
      ...typography.heading,
      color: colors.text,
    },
    address: {
      ...typography.caption,
      color: colors.textMuted,
    },
    chips: {
      gap: spacing.sm,
      paddingRight: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      maxWidth: 170,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    chipText: {
      ...typography.caption,
      color: colors.textMuted,
      flexShrink: 1,
    },
    pressed: { opacity: 0.7 },
  });

export default memo(AreaPickerCard);
