import { FetchArgs, fetchBaseQuery, retry } from '@reduxjs/toolkit/query';
import appConfig from 'constants/appConfig';
import localStorageService from 'services/localStorageService';
import { TokenType } from 'types/libs/auth';

type FetchArgsWithParam = FetchArgs & {
  param?: Record<string, any>;
};

const baseQuery = (): ReturnType<typeof retry> =>
  retry(
    async (args: FetchArgs, api, extraOptions) => {
      const requestArgs = args as FetchArgsWithParam;
      const accessToken = await localStorageService.getItem(
        TokenType.ACCESS_TOKEN,
      );
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
      })(
        {
          ...requestArgs,
          params: requestArgs.params ?? requestArgs.param,
        },
        api,
        extraOptions,
      );

      return result;
    },
    { maxRetries: 0 },
  );

export default baseQuery;
