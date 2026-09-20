import { showNotification } from 'services/notificationService';
import { ToastType } from 'types/status-type';
import { ApiResponse, Page } from 'types/store/bases';

const toToastType = (status?: string): ToastType =>
  status === ToastType.Error || status === ToastType.Success
    ? (status as ToastType)
    : ToastType.Info;

export const transformApiResponse = <T>(response: ApiResponse<T>): T =>
  response?.data as T;

export const transformApiPage = <T>(response: ApiResponse<T[]>): Page<T> => {
  const items = response?.data ?? [];

  return {
    items,
    total: response?.meta?.total ?? items.length,
    hasMore: response?.meta?.hasMore ?? false,
  };
};

export const transformApiResponseWithToast = <T>(
  response: ApiResponse<T>,
): T => {
  if (response?.message) {
    showNotification({
      type: toToastType(response.status),
      header: response.header ?? '',
      message: response.message,
    });
  }
  return response?.data as T;
};
