import { StopWithAddress } from 'types/map-screen-type';
import { Page } from 'types/store/bases';

export type RouteSearchOrder =
  | 'recent'
  | 'oldest'
  | 'popular'
  | 'stops'
  | 'title';

export interface RouteSearchFilters {
  minStops?: number;
  maxStops?: number;
  authorId?: string;
}

export interface SearchRoutesArgs extends RouteSearchFilters {
  q: string;
  sort: RouteSearchOrder;
  limit?: number;
  offset?: number;
}

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

export interface AuthorHit {
  id: string;
  displayName: string;
  photo: string | null;
  publicRouteCount: number;
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
