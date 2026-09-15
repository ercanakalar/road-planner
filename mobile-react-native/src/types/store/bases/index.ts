/** What the API says about the slice of a list it just sent. */
export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  status?: string;
  message?: string;
  header?: string;
  data?: T;
  meta?: PageMeta;
}

/**
 * A list as a screen needs it: the rows loaded so far, how many there are in
 * total, and whether asking again would bring more.
 *
 * `total` is the count before paging, which is the number worth showing next to
 * a filter — "312 routes" is about the filter, while the length of `items` is
 * only about how far the reader has scrolled.
 */
export interface Page<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
