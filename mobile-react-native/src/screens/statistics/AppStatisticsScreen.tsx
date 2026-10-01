import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import DailyActivityChart from 'components/statistics/DailyActivityChart';
import {
  FeatureUsageTable,
  StatRow,
  StatTable,
} from 'components/statistics/StatTable';
import ScreenState from 'components/ui/ScreenState';
import SegmentedControl from 'components/ui/SegmentedControl';
import StatTile from 'components/ui/StatTile';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useStatisticsFormat from 'hooks/statistics/useStatisticsFormat';
import { useGetAppStatisticsQuery } from 'store/services/statisticsService';
import { spacing, useThemedStyles } from 'theme';

const PERIODS = ['7', '30', '90'] as const;

type Period = (typeof PERIODS)[number];

const HTTP_FORBIDDEN = 403;

// The whole app's numbers, for the people with the dashboard permission:
// what is used, by how many, and how that moved against the period before.
const AppStatisticsScreen = () => {
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();
  const { t } = useTranslation();
  const { count } = useStatisticsFormat();

  const [period, setPeriod] = useState<Period>('30');
  const days = Number(period);

  const { data, error, isLoading, isError, isFetching, refetch } =
    useGetAppStatisticsQuery(days);

  if (isLoading) {
    return <ScreenState variant='loading' title={t('statistics.loading')} />;
  }

  if (isError && !data) {
    const isForbidden =
      (error as { status?: unknown } | undefined)?.status === HTTP_FORBIDDEN;

    return (
      <ScreenState
        variant='error'
        title={
          isForbidden
            ? t('statistics.noAccessTitle')
            : t('statistics.errorTitle')
        }
        message={
          isForbidden
            ? t('statistics.noAccessMessage')
            : t('states.checkConnection')
        }
        actionLabel={isForbidden ? undefined : t('actions.tryAgain')}
        onAction={isForbidden ? undefined : refetch}
      />
    );
  }

  if (!data) return null;

  const { totals, consent, features, daily } = data;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={refetch}
          {...refreshColors}
        />
      }
    >
      <SegmentedControl
        segments={PERIODS.map((value) => ({
          value,
          label: t('statistics.lastDays', { count: Number(value) }),
        }))}
        value={period}
        onChange={setPeriod}
        accessibilityLabel={t('statistics.period')}
      />

      {/* While another period loads, the last one stays put, dimmed. */}
      <View style={[styles.content, isFetching && styles.refreshing]}>
        <View style={styles.tiles}>
          <StatTile
            icon='pulse-outline'
            value={count(totals.activeUsers)}
            label={t('statistics.activePeople')}
          />
          <StatTile
            icon='person-add-outline'
            value={count(totals.newUsers)}
            label={t('statistics.newAccounts')}
          />
          <StatTile
            icon='people-outline'
            value={count(totals.users)}
            label={t('statistics.allAccounts')}
          />
        </View>

        <StatTable title={t('statistics.dailyActive')}>
          <DailyActivityChart days={daily} />
        </StatTable>

        <StatTable
          title={t('statistics.features')}
          caption={t('statistics.featuresCaption', { count: days })}
        >
          <FeatureUsageTable features={features} />
        </StatTable>

        <StatTable title={t('statistics.content')}>
          <StatRow
            isFirst
            icon='map-outline'
            label={t('statistics.routesTotal')}
            value={count(totals.routes)}
          />
          <StatRow
            icon='globe-outline'
            label={t('statistics.routesPublic')}
            value={count(totals.publicRoutes)}
          />
          <StatRow
            icon='location-outline'
            label={t('statistics.stopsTotal')}
            value={count(totals.stops)}
          />
          <StatRow
            icon='heart-outline'
            label={t('statistics.favouriteRoutes')}
            value={count(totals.favoriteRoutes)}
          />
          <StatRow
            icon='bookmark-outline'
            label={t('statistics.favouritePlaces')}
            value={count(totals.favoriteStops)}
          />
          <StatRow
            icon='notifications-outline'
            label={t('statistics.follows')}
            value={count(totals.follows)}
          />
        </StatTable>

        <StatTable
          title={t('statistics.privacy')}
          caption={t('statistics.privacyCaption', { count: days })}
        >
          <StatRow
            isFirst
            icon='shield-checkmark-outline'
            label={t('statistics.consentsGiven')}
            value={count(consent.granted)}
          />
          <StatRow
            icon='arrow-undo-outline'
            label={t('statistics.consentsWithdrawn')}
            value={count(consent.withdrawn)}
          />
          <StatRow
            icon='trash-outline'
            label={t('statistics.accountsDeleted')}
            value={count(consent.accountsDeleted)}
          />
        </StatTable>
      </View>
    </ScrollView>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      padding: spacing.lg,
      gap: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    content: { gap: spacing.xl },
    refreshing: { opacity: 0.5 },
    tiles: { flexDirection: 'row', gap: spacing.sm },
  });

export default AppStatisticsScreen;
