import { useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ListRenderItemInfo,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import Container from 'components/ui/Container';
import ScreenState from 'components/ui/ScreenState';
import RouteSummaryRow from 'components/route/RouteSummaryRow';
import AuthorRow from 'components/search/AuthorRow';
import SearchField from 'components/search/SearchField';
import SearchFilterBar from 'components/search/SearchFilterBar';
import useSearchScreen, { SearchTab } from 'hooks/search/useSearchScreen';

import { radius, spacing, typography, useThemedStyles } from 'theme';
import type { ThemeColors } from 'theme';
import {
    AuthorHit,
    RouteSearchHit,
} from 'types/store/services/searchService-type';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

const TABS: { key: SearchTab; label: string }[] = [
    { key: 'routes', label: 'searchScreen.tabRoutes' },
    { key: 'people', label: 'searchScreen.tabPeople' },
];

/**
 * How many matched, which is the question the filters just asked. Deliberately
 * the unpaged total rather than the number of rows loaded: "312 routes" does
 * not change as the list is scrolled.
 */
const countLabel = (
    tab: SearchTab,
    total: number,
    t: TFunction,
): string =>
    t(
        tab === 'people'
            ? 'searchScreen.personCount'
            : 'searchScreen.routeCount',
        { count: total },
    );

const SearchScreen = () => {
    const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();

    const {
        query,
        setQuery,
        clear,
        term,
        isBehind,
        isTermTooShort,
        tab,
        setTab,
        order,
        setOrder,
        length,
        setLength,
        author,
        filterByAuthor,
        clearAuthorFilter,
        routes,
        authors,
        total,
        hasMore,
        loadMore,
        isLoadingMore,
        isSearching,
        isFailed,
        retry,
        isLoggedIn,
        handleToggleFavorite,
        openRoute,
        openAuthor,
        openAuthorOfRoute,
    } = useSearchScreen();

    const renderRoute = useCallback(
        ({ item }: ListRenderItemInfo<RouteSearchHit>) => (
            <RouteSummaryRow
                route={item}
                canFavorite={isLoggedIn}
                onOpen={openRoute}
                onToggleFavorite={handleToggleFavorite}
                onOpenAuthor={openAuthorOfRoute}
            />
        ),
        [handleToggleFavorite, isLoggedIn, openAuthorOfRoute, openRoute],
    );

    const renderAuthor = useCallback(
        ({ item }: ListRenderItemInfo<AuthorHit>) => (
            <AuthorRow
                author={item}
                onSelect={filterByAuthor}
                onOpenProfile={openAuthor}
            />
        ),
        [filterByAuthor, openAuthor],
    );

    const keyExtractor = useCallback((item: { id: string }) => item.id, []);

    const emptyMessage = isTermTooShort
        ? t('searchScreen.keepTyping')
        : term
          ? t('searchScreen.nothingMatches', { term })
          : tab === 'routes'
            ? t('searchScreen.searchRoutesHint')
            : t('searchScreen.searchPeopleHint');

    const empty = isFailed ? (
        <ScreenState
            variant='error'
            title={t('searchScreen.errorTitle')}
            message={t('states.checkConnection')}
            actionLabel={t('common.retry')}
            onAction={retry}
        />
    ) : isSearching ? (
        <ScreenState variant='loading' title={t('states.searching')} />
    ) : (
        <ScreenState
            variant='empty'
            icon='search-outline'
            title={
                term
                    ? t('searchScreen.noMatchesTitle')
                    : t('searchScreen.searchTitle')
            }
            message={
                author
                    ? t('searchScreen.authorNoMatches', {
                          name: author.displayName,
                      })
                    : emptyMessage
            }
        />
    );

    // Only under a list that has rows: the spinner says "more is coming", and
    // an empty list says that for itself.
    const footer =
        isLoadingMore || hasMore ? (
            <View style={styles.footer}>
                {isLoadingMore ? <ActivityIndicator size='small' /> : null}
            </View>
        ) : null;

    // Held back until there is an answer: "0 routes" under a spinner reads as
    // a result rather than as a question still being asked.
    const hasAnswer = !isTermTooShort && !(isSearching && total === 0);
    const count = hasAnswer ? countLabel(tab, total, t) : null;

    return (
        <Container>
            <View style={styles.container}>
                <SearchField
                    value={query}
                    onChange={setQuery}
                    onClear={clear}
                    isBusy={isSearching}
                    autoFocus
                />

                <View style={styles.tabs}>
                    {TABS.map((option) => (
                        <Pressable
                            key={option.key}
                            onPress={() => setTab(option.key)}
                            style={({ pressed }) => [
                                styles.tab,
                                tab === option.key && styles.tabSelected,
                                pressed && styles.tabPressed,
                            ]}
                            accessibilityRole='button'
                            accessibilityState={{
                                selected: tab === option.key,
                            }}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    tab === option.key &&
                                        styles.tabTextSelected,
                                ]}
                            >
                                {t(option.label)}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {tab === 'routes' ? (
                    <>
                        {/*
                            Order and filter belong to the route list, so they
                            leave with it. The person chip lives here too:
                            narrowing to somebody is a filter on this list, set
                            from the other tab.
                        */}
                        <SearchFilterBar
                            order={order}
                            onOrderChange={setOrder}
                            length={length}
                            onLengthChange={setLength}
                            authorName={author?.displayName}
                            onClearAuthor={
                                author ? clearAuthorFilter : undefined
                            }
                            summary={count}
                            isSummaryStale={isBehind || isSearching}
                        />

                        <FlatList
                            data={routes}
                            keyExtractor={keyExtractor}
                            renderItem={renderRoute}
                            style={isBehind ? styles.stale : undefined}
                            contentContainerStyle={
                                routes.length === 0
                                    ? styles.emptyContent
                                    : styles.listContent
                            }
                            keyboardShouldPersistTaps='handled'
                            keyboardDismissMode='on-drag'
                            ListEmptyComponent={empty}
                            ListFooterComponent={footer}
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.6}
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={7}
                        />
                    </>
                ) : (
                    <>
                        <FlatList
                            data={authors}
                            keyExtractor={keyExtractor}
                            renderItem={renderAuthor}
                            style={isBehind ? styles.stale : undefined}
                            contentContainerStyle={
                                authors.length === 0
                                    ? styles.emptyContent
                                    : styles.listContent
                            }
                            keyboardShouldPersistTaps='handled'
                            keyboardDismissMode='on-drag'
                            ListEmptyComponent={empty}
                            ListHeaderComponent={
                                count ? (
                                    <Text
                                        style={[
                                            styles.peopleCount,
                                            isSearching && styles.stale,
                                        ]}
                                    >
                                        {count}
                                    </Text>
                                ) : null
                            }
                            ListFooterComponent={footer}
                            onEndReached={loadMore}
                            onEndReachedThreshold={0.6}
                            initialNumToRender={12}
                            maxToRenderPerBatch={12}
                            windowSize={7}
                        />
                    </>
                )}
            </View>
        </Container>
    );
};

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: { flex: 1, gap: spacing.md, padding: 'auto' },
        tabs: {
            flexDirection: 'row',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
        },
        tab: {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
        },
        tabSelected: {
            backgroundColor: colors.primarySoft,
            borderColor: colors.primary,
        },
        tabPressed: { opacity: 0.7 },
        tabText: {
            ...typography.label,
            color: colors.textMuted,
        },
        tabTextSelected: { color: colors.primary },
        listContent: {
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xxl,
        },
        emptyContent: { flexGrow: 1 },
        stale: { opacity: 0.6 },
        peopleCount: {
            ...typography.caption,
            fontSize: 11,
            color: colors.textSubtle,
            paddingBottom: spacing.xxs,
        },
        footer: {
            paddingVertical: spacing.lg,
            alignItems: 'center',
        },
    });

export default SearchScreen;
