import localStorageService from 'services/localStorageService';
import { showNotification } from 'services/notificationService';
import { TokenType } from 'types/libs/auth';

interface ApiResponse {
  Response: string;
  [key: string]: any;
}

export const transformApiResponse = <T extends ApiResponse>(
  data: T,
  query?: string
): T => {
  if (query && query === 'logout') {
    localStorageService.removeItem(TokenType.ACCESS_TOKEN);
    localStorageService.removeItem(TokenType.REFRESH_TOKEN);
  }

  if (data?.message) {
    showNotification({
      type: data.status,
      header: `${data.header}`,
      message: `${data.message}`,
    });
  }
  return data;
};
