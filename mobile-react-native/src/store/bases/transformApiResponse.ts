import localStorageService from 'services/localStorageService';
import { showNotification } from 'services/notificationService';
import { TokenType } from 'types/libs/auth';
import { ApiResponse } from 'types/store/bases';

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  return typeof value === 'object' && value !== null && 'data' in value;
};

export const transformApiResponse = <T>(
  response: unknown,
  query?: string,
): T => {
  if (query === 'logout') {
    localStorageService.removeItem(TokenType.ACCESS_TOKEN);
    localStorageService.removeItem(TokenType.REFRESH_TOKEN);
  }

  const normalized = isApiResponse<T>(response)
    ? response
    : ({ data: response } as ApiResponse<T>);

  if (normalized?.message) {
    showNotification({
      type: normalized.status as any,
      header: normalized.header ?? '',
      message: normalized.message,
    });
  }

  return normalized.data as T;
};
