import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import { SEARCH_PAGE_SIZE } from 'constants/pagination';
import {
  transformApiPage,
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import {
  appendPage,
  pagedCacheKey,
  refetchOnNewPage,
} from 'store/bases/paging';
import { ApiResponse } from 'types/store/bases';
import {
  AuthorHit,
  FollowAuthorArgs,
  FollowAuthorResponse,
  GetAuthorArgs,
  GetAuthorResponse,
  RouteSearchHit,
  SearchAuthorsArgs,
  SearchAuthorsResponse,
  SearchRoutesArgs,
  SearchRoutesResponse,
} from 'types/store/services/searchService-type';

/**
 * Search results are the one thing here that should not be served from cache
 * for long: they are a snapshot of what everyone has published, and a stale one
 * looks like the app ignoring what was typed.
 */
const CACHE_SECONDS = 60;

export const searchService = createApi({
  reducerPath: 'searchService',
  baseQuery: baseQuery(),
  tagTypes: ['SearchRoute', 'SearchAuthor'],
  keepUnusedDataFor: CACHE_SECONDS,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    searchRoutes: builder.query<SearchRoutesResponse, SearchRoutesArgs>({
      query: ({ q, sort, minStops, maxStops, authorId, limit, offset }) => ({
        url: '/road/search',
        method: 'GET',
        params: {
          q: q.trim() || undefined,
          sort,
          minStops,
          maxStops,
          authorId,
          limit: limit ?? SEARCH_PAGE_SIZE,
          offset: offset || undefined,
        },
      }),
      transformResponse: (res: ApiResponse<RouteSearchHit[]>) =>
        transformApiPage(res),
      serializeQueryArgs: pagedCacheKey,
      merge: (current, incoming, { arg }) =>
        appendPage(current, incoming, arg.offset),
      forceRefetch: refetchOnNewPage,
      providesTags: [{ type: 'SearchRoute' as const, id: 'LIST' }],
    }),

    searchAuthors: builder.query<SearchAuthorsResponse, SearchAuthorsArgs>({
      query: ({ q, limit, offset }) => ({
        url: '/user/search',
        method: 'GET',
        params: {
          q: q.trim() || undefined,
          limit: limit ?? SEARCH_PAGE_SIZE,
          offset: offset || undefined,
        },
      }),
      transformResponse: (res: ApiResponse<AuthorHit[]>) =>
        transformApiPage(res),
      serializeQueryArgs: pagedCacheKey,
      merge: (current, incoming, { arg }) =>
        appendPage(current, incoming, arg.offset),
      forceRefetch: refetchOnNewPage,
      providesTags: [{ type: 'SearchAuthor' as const, id: 'LIST' }],
    }),

    getAuthor: builder.query<GetAuthorResponse | null, GetAuthorArgs>({
      query: ({ authorId }) => ({
        url: `/user/author/${authorId}`,
        method: 'GET',
      }),
      transformResponse: (res: ApiResponse<GetAuthorResponse>) =>
        transformApiResponse(res) ?? null,
      providesTags: (_result, _error, { authorId }) => [
        { type: 'SearchAuthor' as const, id: authorId },
      ],
    }),

    /**
     * Turns "tell me when they publish" on or off.
     *
     * The switch says which way it was moved rather than asking the server to
     * toggle, so a tap that raced a list refresh cannot flip it the wrong way.
     * The row on screen is corrected immediately and put back if the request
     * fails — a follow button that waits for a round trip feels broken.
     */
    followAuthor: builder.mutation<FollowAuthorResponse, FollowAuthorArgs>({
      query: ({ authorId, follow }) => ({
        url: `/user/author/${authorId}/follow`,
        method: 'POST',
        body: { follow },
      }),
      transformResponse: (res: ApiResponse<FollowAuthorResponse>) =>
        transformApiResponseWithToast(res),
      async onQueryStarted(
        { authorId, follow },
        { dispatch, getState, queryFulfilled },
      ) {
        // The same person can be on screen twice — their page, and any People
        // search they turned up in — and every search term is a cache entry of
        // its own. Invalidating those instead of patching them would re-fetch
        // each at whatever page it had scrolled to, which updates the last page
        // of rows and leaves the earlier ones showing the old state.
        const patches = [
          dispatch(
            searchService.util.updateQueryData(
              'getAuthor',
              { authorId },
              (draft) => {
                if (draft) draft.isFollowed = follow;
              },
            ),
          ),
          ...searchService.util
            .selectCachedArgsForQuery(getState(), 'searchAuthors')
            .map((args) =>
              dispatch(
                searchService.util.updateQueryData(
                  'searchAuthors',
                  args,
                  (draft) => {
                    const row = draft.items.find(
                      (item) => item.id === authorId,
                    );
                    if (row) row.isFollowed = follow;
                  },
                ),
              ),
            ),
        ];

        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
      // Their own page is re-read so the server has the last word on it; the
      // lists above are left with the patch.
      invalidatesTags: (_result, _error, { authorId }) => [
        { type: 'SearchAuthor' as const, id: authorId },
      ],
    }),
  }),
});

export const {
  useSearchRoutesQuery,
  useSearchAuthorsQuery,
  useGetAuthorQuery,
  useFollowAuthorMutation,
} = searchService;

export default searchService;
