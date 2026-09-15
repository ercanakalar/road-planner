import { StopWithAddress } from 'types/map-screen-type';
import { Page } from 'types/store/bases';

/** How a page of route results is ordered. Mirrors the API's own list. */
export type RouteSearchOrder =
  | 'recent'
  | 'oldest'
  | 'popular'
  | 'stops'
  | 'title';

export interface RouteSearchFilters {
  /** Only routes with at least this many stops. */
  minStops?: number;
  /** Only routes with at most this many stops. */
  maxStops?: number;
  /** Only routes by this person, which is what tapping them does. */
  authorId?: string;
}

export interface SearchRoutesArgs extends RouteSearchFilters {
  q: string;
  sort: RouteSearchOrder;
  limit?: number;
  /** How many rows to skip. Everything above this is one cache entry. */
  offset?: number;
}

/**
 * A route as search returns it. Wider than a Discover card by the two counts
 * the sort options are named after, so a result can show why it ranked where
 * it did.
 */
export interface RouteSearchHit {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  authorId: string;
  author: string;
  authorPhoto: string | null;
  stopCount: number;
  favoriteCount: number;
  isFavorite: boolean;
  stops: StopWithAddress[];
}

export type SearchRoutesResponse = Page<RouteSearchHit>;

export interface SearchAuthorsArgs {
  q: string;
  limit?: number;
  offset?: number;
}

/**
 * Someone who has published at least one route. The API will not return anyone
 * else, and returns no email and no surname for those it does.
 */
export interface AuthorHit {
  id: string;
  displayName: string;
  photo: string | null;
  publicRouteCount: number;
  /** Whether the signed-in reader has asked to hear about their new routes. */
  isFollowed: boolean;
}

export type SearchAuthorsResponse = Page<AuthorHit>;

export interface GetAuthorArgs {
  authorId: string;
}

export type GetAuthorResponse = AuthorHit;

export interface FollowAuthorArgs {
  authorId: string;
  follow: boolean;
}

export interface FollowAuthorResponse {
  authorId: string;
  isFollowed: boolean;
}
