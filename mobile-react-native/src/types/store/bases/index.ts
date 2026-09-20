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

export interface Page<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
