import createApi from 'store/middlewares/createApi';
import baseQuery from 'store/bases/baseQuery';
import {
  transformApiResponse,
  transformApiResponseWithToast,
} from 'store/bases/transformApiResponse';
import { ApiResponse } from 'types/store/bases';
import { KvkkConsentRecord, KvkkLanguage } from 'types/kvkk';

export interface ConsentWithdrawal {
  version: string;
  language: KvkkLanguage;
}

export const consentService = createApi({
  reducerPath: 'consentService',
  baseQuery: baseQuery(),
  endpoints: (builder) => ({
    // Ties the consent given on this phone to the account now signed in to.
    // Sent after every sign-in; the server ignores a version it already has.
    grantConsent: builder.mutation<{ recorded: boolean }, KvkkConsentRecord>({
      query: ({ version, acceptedAt, language }) => ({
        url: '/consent',
        method: 'POST',
        body: { noticeVersion: version, acceptedAt, language },
      }),
      transformResponse: (res: ApiResponse<{ recorded: boolean }>) =>
        transformApiResponse(res),
    }),

    // Erases the account. Safe to retry: the server treats a repeat of a
    // completed withdrawal as the success it was.
    withdrawConsent: builder.mutation<{ deleted: boolean }, ConsentWithdrawal>(
      {
        query: ({ version, language }) => ({
          url: '/consent/withdraw',
          method: 'POST',
          body: { noticeVersion: version, language },
        }),
        transformResponse: (res: ApiResponse<{ deleted: boolean }>) =>
          transformApiResponseWithToast(res),
      },
    ),
  }),
});

export const { useGrantConsentMutation, useWithdrawConsentMutation } =
  consentService;
