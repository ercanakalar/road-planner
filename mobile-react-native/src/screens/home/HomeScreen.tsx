import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Container from 'components/ui/Container';
import PrimaryButton from 'components/ui/PrimaryButton';
import StatTile from 'components/ui/StatTile';
import useRefreshControlColors from 'hooks/common/useRefreshControlColors';
import useHomeScreen from 'hooks/home/useHomeScreen';
import RouteSummaryRow from 'components/road/RouteSummaryRow';
import SearchBarButton from 'components/search/SearchBarButton';

import {
    radius,
    shadows,
    spacing,
    typography,
    useTheme,
    useThemedStyles,
} from 'theme';
import type { ThemeColors } from 'theme';

const HomeScreen = () => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const refreshColors = useRefreshControlColors();

    const {
        isLoggedIn,
        stats,
        discoverRoads,
        isDiscovering,
        refetchDiscover,
        savingRoadId,
        goToRoutes,
        goToSignIn,
        goToSearch,
        handleOpenCommunityRoad,
        handleToggleCommunityFavorite,
    } = useHomeScreen();

    return (
        <Container>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={isDiscovering}
                        onRefresh={refetchDiscover}
                        {...refreshColors}
                    />
                }
            >
                <View style={styles.heading}>
                    <Text style={styles.title}>Travel Routes</Text>
                    <SearchBarButton onPress={goToSearch} />
                </View>

                {isLoggedIn ? (
                    <>
                        <View style={styles.statsRow}>
                            <StatTile
                                icon='map-outline'
                                value={stats.routes}
                                label='Routes'
                            />
                            <StatTile
                                icon='location-outline'
                                value={stats.stops}
                                label='Stops'
                            />
                            <StatTile
                                icon='star-outline'
                                value={stats.favorites}
                                label='Favourites'
                            />
                        </View>
                    </>
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            Sign in to get started
                        </Text>
                        <Text style={styles.cardBody}>
                            Your routes, stops and favourites sync with your
                            account.
                        </Text>
                        <PrimaryButton label='Sign in' onPress={goToSignIn} />
                    </View>
                )}

                <View style={styles.discover}>
                    <View style={styles.discoverHeader}>
                        <View style={styles.discoverHeadings}>
                            <Text style={styles.sectionTitle}>
                                Routes from the community
                            </Text>
                            <Text style={styles.sectionHint}>
                                A different handful every time you look.
                            </Text>
                        </View>

                        <Pressable
                            onPress={refetchDiscover}
                            hitSlop={10}
                            disabled={isDiscovering}
                            accessibilityRole='button'
                            accessibilityLabel='Show different routes'
                            style={({ pressed }) => [
                                styles.shuffle,
                                pressed && styles.shufflePressed,
                            ]}
                        >
                            {isDiscovering ? (
                                <ActivityIndicator
                                    size='small'
                                    color={colors.primary}
                                />
                            ) : (
                                <Ionicons
                                    name='shuffle'
                                    size={18}
                                    color={colors.primary}
                                />
                            )}
                        </Pressable>
                    </View>

                    {discoverRoads.length ? (
                        discoverRoads.map((road) => (
                            <RouteSummaryRow
                                key={road.id}
                                route={road}
                                canFavorite={isLoggedIn}
                                isSaving={savingRoadId === road.id}
                                onOpen={handleOpenCommunityRoad}
                                onToggleFavorite={handleToggleCommunityFavorite}
                            />
                        ))
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.cardBody}>
                                {isDiscovering
                                    ? 'Looking for published routes…'
                                    : 'Nobody has published a route yet. Publish one of yours from its edit screen and it will show up here for everyone.'}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </Container>
    );
};

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        content: {
            padding: spacing.lg,
            gap: spacing.xl,
        },
        heading: { gap: spacing.md, paddingTop: spacing.sm },
        // The screen's own name, kept small: search is what this header is for now,
        // and the tab bar already says where you are.
        title: {
            ...typography.title,
            color: colors.text,
        },
        statsRow: {
            flexDirection: 'row',
            gap: spacing.md,
        },
        discover: { gap: spacing.sm },
        discoverHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
        },
        discoverHeadings: { flex: 1, gap: spacing.xxs },
        sectionTitle: {
            ...typography.title,
            color: colors.text,
        },
        sectionHint: {
            ...typography.caption,
            color: colors.textMuted,
        },
        shuffle: {
            width: 38,
            height: 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.pill,
            backgroundColor: colors.primarySoft,
        },
        shufflePressed: { opacity: 0.7 },
        card: {
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            ...shadows.sm,
        },
        cardTitle: {
            ...typography.heading,
            color: colors.text,
        },
        cardBody: {
            ...typography.caption,
            color: colors.textMuted,
            lineHeight: 18,
        },
    });

export default HomeScreen;
