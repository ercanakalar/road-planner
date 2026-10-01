import { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { featureWords, StatRow, StatTable } from 'components/statistics/StatTable';
import ScreenState from 'components/ui/ScreenState';
import SettingsRow from 'components/ui/SettingsRow';
import StatTile from 'components/ui/StatTile';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useStatisticsFormat from 'hooks/statistics/useStatisticsFormat';
import { useAppSelector } from 'store/hook';
import { useGetMyStatisticsQuery } from 'store/services/statisticsService';
import { radius, shadows, spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import { RootStackParamList } from 'types/screens/screens';
import { formatConsentDate } from 'utils/formatConsentDate';
import { groupByCity } from 'utils/travelCities';

type Props = { navigation: NavigationProp<RootStackParamList> };

const StatisticsScreen = ({ navigation }: Props) => {
  const styles = useThemedStyles(createStyles);
  const refreshColors = useRefreshControlColors();
  const { t } = useTranslation();
  const { count, language } = useStatisticsFormat();

  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const areas = useAppSelector((state) => state.travelMap.areas);

  const { data, isLoading, isError, isFetching, refetch } =
    useGetMyStatisticsQuery(undefined, { skip: !isLoggedIn });

  // The travel map never leaves the phone, so its numbers come from here.
  const travel = useMemo(
    () => ({
      countries: areas.filter(({ kind }) => kind === 'country').length,
      cities: groupByCity(areas).cities.length,
      places: areas.length,
    }),
    [areas],
  );

  const goToAppStatistics = useCallback(
    () => navigation.navigate('AppStatisticsScreen'),
    [navigation],
  );

  if (!isLoggedIn) {
    return (
      <ScreenState
        variant='empty'
        icon='stats-chart-outline'
        title={t('statistics.signedOutTitle')}
        message={t('statistics.signedOutMessage')}
      />
    );
  }

  if (isLoading) {
    return <ScreenState variant='loading' title={t('statistics.loading')} />;
  }

  if (isError || !data) {
    return (
      <ScreenState
        variant='error'
        title={t('statistics.errorTitle')}
        message={t('states.checkConnection')}
        actionLabel={t('actions.tryAgain')}
        onAction={refetch}
      />
    );
  }

  const { routes, favorites, reach, activity } = data;

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
      <View style={styles.tiles}>
        <StatTile
          icon='map-outline'
          value={count(routes.total)}
          label={t('statistics.routes')}
        />
        <StatTile
          icon='location-outline'
          value={count(routes.stops)}
          label={t('statistics.stops')}
        />
        <StatTile
          icon='people-outline'
          value={count(reach.followers)}
          label={t('statistics.followers')}
        />
      </View>

      <StatTable title={t('statistics.yourRoutes')}>
        <StatRow
          isFirst
          icon='map-outline'
          label={t('statistics.routesTotal')}
          value={count(routes.total)}
        />
        <StatRow
          icon='globe-outline'
          label={t('statistics.routesPublic')}
          value={count(routes.public)}
        />
        <StatRow
          icon='location-outline'
          label={t('statistics.stopsTotal')}
          value={count(routes.stops)}
        />
      </StatTable>

      <StatTable title={t('statistics.favourites')}>
        <StatRow
          isFirst
          icon='heart-outline'
          label={t('statistics.favouriteRoutes')}
          value={count(favorites.routes)}
        />
        <StatRow
          icon='bookmark-outline'
          label={t('statistics.favouritePlaces')}
          value={count(favorites.stops)}
        />
      </StatTable>

      <StatTable
        title={t('statistics.reach')}
        caption={t('statistics.reachCaption')}
      >
        <StatRow
          isFirst
          icon='people-outline'
          label={t('statistics.followers')}
          value={count(reach.followers)}
        />
        <StatRow
          icon='person-add-outline'
          label={t('statistics.following')}
          value={count(reach.following)}
        />
        <StatRow
          icon='heart-circle-outline'
          label={t('statistics.savesByOthers')}
          value={count(reach.savesByOthers)}
        />
      </StatTable>

      <StatTable
        title={t('statistics.travelMap')}
        caption={t('statistics.travelMapCaption')}
      >
        <StatRow
          isFirst
          icon='earth-outline'
          label={t('statistics.countries')}
          value={count(travel.countries)}
        />
        <StatRow
          icon='business-outline'
          label={t('statistics.cities')}
          value={count(travel.cities)}
        />
        <StatRow
          icon='color-fill-outline'
          label={t('statistics.placesMarked')}
          value={count(travel.places)}
        />
      </StatTable>

      <StatTable title={t('statistics.activity', { count: activity.days })}>
        {activity.events.length ? (
          activity.events.map(({ event, count: uses }, index) => {
            const { label, icon } = featureWords(event, t);

            return (
              <StatRow
                key={event}
                isFirst={index === 0}
                icon={icon}
                label={label}
                value={count(uses)}
              />
            );
          })
        ) : (
          <StatRow isFirst label={t('statistics.noActivity')} value='—' />
        )}
      </StatTable>

      {data.canViewOverview ? (
        <View style={styles.group}>
          <SettingsRow
            icon='analytics-outline'
            label={t('statistics.appStatistics')}
            description={t('statistics.appStatisticsHint')}
            divided={false}
            onPress={goToAppStatistics}
          />
        </View>
      ) : null}

      <Text style={styles.footer}>
        {t('statistics.memberSince', {
          date: formatConsentDate(data.memberSince, language),
        })}
      </Text>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: spacing.lg,
      gap: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    tiles: { flexDirection: 'row', gap: spacing.sm },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadows.sm,
    },
    footer: {
      ...typography.caption,
      color: colors.textSubtle,
      textAlign: 'center',
    },
  });

export default StatisticsScreen;
