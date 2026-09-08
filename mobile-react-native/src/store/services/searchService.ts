import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import { SEARCH_PAGE_SIZE } from 'constants/pagination';
import { transformApiResponse } from 'store/bases/transformApiResponse';
import { ApiResponse } from 'types/store/bases';
import {
  GetAuthorArgs,
  GetAuthorResponse,
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
      query: ({ q, sort, minStops, maxStops, authorId, limit }) => ({
        url: '/road/search',
        method: 'GET',
        params: {
          q: q.trim() || undefined,
          sort,
          minStops,
          maxStops,
          authorId,
          limit: limit ?? SEARCH_PAGE_SIZE,
        },
      }),
      transformResponse: (res: ApiResponse<SearchRoutesResponse>) =>
        transformApiResponse(res) ?? [],
      providesTags: [{ type: 'SearchRoute' as const, id: 'LIST' }],
    }),

    searchAuthors: builder.query<SearchAuthorsResponse, SearchAuthorsArgs>({
      query: ({ q, limit }) => ({
        url: '/user/search',
        method: 'GET',
        params: { q: q.trim() || undefined, limit: limit ?? SEARCH_PAGE_SIZE },
      }),
      transformResponse: (res: ApiResponse<SearchAuthorsResponse>) =>
        transformApiResponse(res) ?? [],
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
  }),
});

export const {
  useSearchRoutesQuery,
  useSearchAuthorsQuery,
  useGetAuthorQuery,
} = searchService;

export default searchService;
