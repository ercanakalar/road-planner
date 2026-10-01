import { memo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  USAGE_FEATURE_FALLBACK_ICON,
  USAGE_FEATURES,
} from 'constants/usageFeatures';
import useStatisticsFormat from 'hooks/statistics/useStatisticsFormat';
import {
  radius,
  shadows,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';
import { FeatureUsage } from 'types/store/services/statisticsService-type';
import { Trend, trendOf } from 'utils/statistics';

type IconName = keyof typeof Ionicons.glyphMap;

export const StatTable = ({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole='header'>
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
};

export const StatRow = memo(
  ({
    icon,
    label,
    value,
    isFirst = false,
  }: {
    icon?: IconName;
    label: string;
    value: string;
    isFirst?: boolean;
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    return (
      <View
        style={[styles.row, !isFirst && styles.rowDivided]}
        accessible
        accessibilityLabel={`${label}: ${value}`}
      >
        {icon ? (
          <Ionicons name={icon} size={16} color={colors.textMuted} />
        ) : null}
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    );
  },
);

StatRow.displayName = 'StatRow';

export const featureWords = (
  event: string,
  t: (key: string) => string,
): { label: string; icon: IconName } => {
  const known = USAGE_FEATURES[event];
  return known
    ? { label: t(known.label), icon: known.icon }
    : { label: event, icon: USAGE_FEATURE_FALLBACK_ICON };
};

const TrendCell = ({ trend }: { trend: Trend }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

  const text =
    trend.kind === 'up'
      ? t('statistics.trendUp', { percent: trend.percent })
      : trend.kind === 'down'
        ? t('statistics.trendDown', { percent: trend.percent })
        : trend.kind === 'new'
          ? t('statistics.trendNew')
          : trend.kind === 'gone'
            ? t('statistics.trendGone')
            : trend.kind === 'same'
              ? t('statistics.trendSame')
              : '—';

  // Direction is carried by the arrow, in the status colour; the words stay
  // in text ink so they read on any surface.
  const arrow =
    trend.kind === 'up' || trend.kind === 'new'
      ? { name: 'arrow-up' as const, color: colors.success }
      : trend.kind === 'down' || trend.kind === 'gone'
        ? { name: 'arrow-down' as const, color: colors.danger }
        : null;

  return (
    <View style={[styles.column, styles.trend]}>
      {arrow ? (
        <Ionicons name={arrow.name} size={12} color={arrow.color} />
      ) : null}
      <Text style={styles.cell} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
};

export const FeatureUsageTable = memo(
  ({ features }: { features: readonly FeatureUsage[] }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useTranslation();
    const { count } = useStatisticsFormat();

    return (
      <View accessibilityRole='list'>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.labelColumn]}>
            {t('statistics.columnFeature')}
          </Text>
          <Text style={[styles.headerCell, styles.column]}>
            {t('statistics.columnUses')}
          </Text>
          <Text style={[styles.headerCell, styles.column]}>
            {t('statistics.columnPeople')}
          </Text>
          <Text style={[styles.headerCell, styles.column, styles.trendHeader]}>
            {t('statistics.columnChange')}
          </Text>
        </View>

        {features.map((feature) => {
          const { label, icon } = featureWords(feature.event, t);
          const trend = trendOf(feature.count, feature.previousCount);
          const isIdle = feature.count === 0;

          return (
            <View
              key={feature.event}
              style={[styles.row, styles.rowDivided, isIdle && styles.idle]}
              accessible
              accessibilityLabel={t('statistics.featureRowAccessibility', {
                feature: label,
                uses: count(feature.count),
                people: count(feature.users),
              })}
            >
              <View style={[styles.labelColumn, styles.featureLabel]}>
                <Ionicons name={icon} size={15} color={colors.textMuted} />
                <Text style={styles.label} numberOfLines={2}>
                  {label}
                </Text>
              </View>
              <Text style={[styles.cell, styles.column]}>
                {count(feature.count)}
              </Text>
              <Text style={[styles.cell, styles.column]}>
                {count(feature.users)}
              </Text>
              <TrendCell trend={trend} />
            </View>
          );
        })}
      </View>
    );
  },
);

FeatureUsageTable.displayName = 'FeatureUsageTable';

const NUMBER_COLUMN_WIDTH = 56;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: { gap: spacing.sm },
    sectionTitle: {
      ...typography.overline,
      color: colors.textSubtle,
      paddingHorizontal: spacing.xs,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.sm,
    },
    caption: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    rowDivided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    idle: { opacity: 0.6 },
    label: {
      ...typography.body,
      flex: 1,
      color: colors.text,
    },
    value: {
      ...typography.body,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surfaceAlt,
    },
    headerCell: {
      ...typography.overline,
      color: colors.textSubtle,
    },
    labelColumn: { flex: 1 },
    featureLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    column: {
      width: NUMBER_COLUMN_WIDTH,
      textAlign: 'right',
    },
    cell: {
      ...typography.label,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    trend: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.xxs,
    },
    trendHeader: { textAlign: 'right' },
  });
