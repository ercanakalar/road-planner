export interface ApiResponse<T> {
  status?: string;
  message?: string;
  header?: string;
  data?: T;
}
