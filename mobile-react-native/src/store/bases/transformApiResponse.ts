import localStorageService from 'services/localStorageService';
import { showNotification } from 'services/notificationService';
import { TokenType } from 'types/libs/auth';
import { ApiResponse } from 'types/store/bases';

export const transformApiResponse = <T>(
  response: ApiResponse<T>,
  query?: string,
): T => {
  if (query === 'logout') {
    localStorageService.removeItem(TokenType.ACCESS_TOKEN);
    localStorageService.removeItem(TokenType.REFRESH_TOKEN);
  }

  if (response?.message) {
    showNotification({
      type: response.status as any,
      header: response.header ?? '',
      message: response.message,
    });
  }

  return response.data as T;
};
