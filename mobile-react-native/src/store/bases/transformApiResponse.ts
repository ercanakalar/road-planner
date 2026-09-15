import { showNotification } from 'services/notificationService';
import { ToastType } from 'types/status-type';
import { ApiResponse, Page } from 'types/store/bases';

const toToastType = (status?: string): ToastType =>
  status === ToastType.Error || status === ToastType.Success
    ? (status as ToastType)
    : ToastType.Info;

export const transformApiResponse = <T>(response: ApiResponse<T>): T =>
  response?.data as T;

/**
 * The same unwrapping, keeping the paging the envelope carries alongside the
 * rows. `transformApiResponse` drops `meta`, which is where the unpaged total
 * and "is there more" live — the two things a list needs to say how many
 * matched and to know when to stop asking.
 *
 * An endpoint that answers without `meta` is treated as a single complete page,
 * so a screen reading a page never has to care which kind it got.
 */
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
