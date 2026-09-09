import { useCallback } from 'react';
import {
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

const TABS: { key: SearchTab; label: string }[] = [
    { key: 'routes', label: 'Routes' },
    { key: 'people', label: 'People' },
];

const SearchScreen = () => {
    const styles = useThemedStyles(createStyles);

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
        routes,
        authors,
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
            <AuthorRow author={item} onOpen={openAuthor} />
        ),
        [openAuthor],
    );

    const keyExtractor = useCallback((item: { id: string }) => item.id, []);

    const emptyMessage = isTermTooShort
        ? 'Keep typing — two letters at least.'
        : term
          ? `Nothing matches “${term}”.`
          : tab === 'routes'
            ? 'Search published routes, or browse the newest below.'
            : 'Search for someone who has published a route.';

    const empty = isFailed ? (
        <ScreenState
            variant='error'
            title='Search is not answering'
            message='Check your connection and try again.'
            actionLabel='Retry'
            onAction={retry}
        />
    ) : isSearching ? (
        <ScreenState variant='loading' title='Searching…' />
    ) : (
        <ScreenState
            variant='empty'
            icon='search-outline'
            title={term ? 'No matches' : 'Search'}
            message={emptyMessage}
        />
    );

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
                                {option.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Order and filter belong to the route list, so they leave with it. */}
                {tab === 'routes' ? (
                    <SearchFilterBar
                        order={order}
                        onOrderChange={setOrder}
                        length={length}
                        onLengthChange={setLength}
                    />
                ) : null}

                {tab === 'routes' ? (
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
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={7}
                    />
                ) : (
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
                        initialNumToRender={12}
                        maxToRenderPerBatch={12}
                        windowSize={7}
                    />
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
    });

export default SearchScreen;
