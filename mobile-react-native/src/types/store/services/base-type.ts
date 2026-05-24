import { ToastType } from 'types/status-type';

export interface ApiResponse<T> {
  status: ToastType;
  header: string;
  message: string;
  data: T;
}
