import i18n from 'i18n';
import { ApiResponse } from 'types/store/bases';

export const apiErrorMessage = (error: unknown, fallback: string): string => {
  const status = (error as { status?: unknown } | undefined)?.status;

  if (status === 'FETCH_ERROR') return i18n.t('errors.unreachable');
  if (status === 'TIMEOUT_ERROR') return i18n.t('errors.timedOut');

  const body = (error as { data?: unknown } | undefined)?.data as
    | ApiResponse<unknown>
    | undefined;

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (message) return message;

  if (status === 'PARSING_ERROR') {
    const original = (error as { originalStatus?: unknown }).originalStatus;
    return i18n.t('errors.unreadable', {
      status: typeof original === 'number' ? original : i18n.t('errors.noStatus'),
    });
  }

  if (typeof status === 'number') {
    return i18n.t('errors.noReason', { status });
  }

  return fallback;
};

export default apiErrorMessage;
