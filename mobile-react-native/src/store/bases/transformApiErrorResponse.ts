export type ErrorMap = Record<string, string>;

export interface ApiError {
  status: number;
  type?: string;
  errors: ErrorMap;
  messages?: string[];
  message: string;
  code: number;
}

const DEFAULT_ERROR: ApiError = {
  errors: {
    error: 'Bir hata oluştu.',
  },
  message: 'Bir hata oluştu.',
  status: 500,
  code: 500,
};

interface BaseQueryErrorResponse {
  error?: ApiError;
}

export const transformApiErrorResponse = (
  response: BaseQueryErrorResponse,
): ApiError => {
  return response.error ?? DEFAULT_ERROR;
};
