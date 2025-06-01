import { FetchArgs, fetchBaseQuery, retry } from '@reduxjs/toolkit/query';
import appConfig from 'constants/appConfig';
import Toast from 'react-native-toast-message';
import localStorageService from 'services/localStorageService';

const requestError = (error: any) => ({
  error: error?.message || error?.response?.statusText || 'An error occurred',
  message: error?.response?.statusText || 'An error occurred',
  status: error?.response?.status || 500,
  data: error?.response?.data || {},
});

interface IBaseQueryResult<T> {
  data?: T;
  error?: { data: any; message: any };
  meta?: { response?: Response };
}

interface IErrorType {
  error: string;
  message?: string;
  code?: number;
  [key: string]: any;
}

const baseQuery = (): ReturnType<typeof retry> =>
  retry(
    async (args: FetchArgs, api, extraOptions) => {
      const accessToken = await localStorageService.getItem('access_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const result = await fetchBaseQuery({
        baseUrl: appConfig.baseUrl,
        prepareHeaders: (headers) => {
          Object.entries(headers).forEach(([key, value]) => {
            headers.set(key, value);
          });
          return headers;
        },
      })(args, api, extraOptions);

      return result;
    },
    { maxRetries: 0 }
  );

export default baseQuery;
