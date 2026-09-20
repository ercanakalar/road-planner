import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import {
  ImportedRoute,
  importGoogleMapsRoute,
} from 'services/googleMapsRouteImport';
import { showNotification } from 'services/notificationService';
import { useAppDispatch } from 'store/hook';
import { localRouteImported } from 'store/slices/localRouteSlice';
import { useTranslation } from 'react-i18next';

const NOT_A_ROUTE =
  'errors.notARoute';

export function useGoogleMapsImport() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [link, setLink] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [preview, setPreview] = useState<ImportedRoute | null>(null);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setLink('');
    setPreview(null);
    setError('');
    setIsReading(false);
  }, []);

  const handleLinkChange = useCallback((value: string) => {
    setLink(value);
    setPreview(null);
    setError('');
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    if (text) handleLinkChange(text.trim());
  }, [handleLinkChange]);

  const read = useCallback(async () => {
    const trimmed = link.trim();
    if (!trimmed || isReading) return;

    setIsReading(true);
    setError('');

    try {
      const result = await importGoogleMapsRoute(trimmed);

      if (!result || result.resolved.length === 0) {
        setPreview(null);
        setError(t(result ? 'errors.noStopsFound' : NOT_A_ROUTE));
        return;
      }

      setPreview(result);
    } catch {
      setPreview(null);
      setError(t('errors.couldNotReadLink'));
    } finally {
      setIsReading(false);
    }
  }, [isReading, link]);

  const confirm = useCallback(
    (title: string) => {
      if (!preview || preview.resolved.length === 0) return false;

      dispatch(
        localRouteImported({
          title: title.trim() || t('defaults.importedRoute'),
          stops: preview.resolved.map(({ latitude, longitude, address }) => ({
            latitude,
            longitude,
            address,
          })),
        }),
      );

      showNotification({
        type: 'success',
        header: t('toast.routeImported'),
        message: t('toast.stopsAddedFromGoogle', {
          count: preview.resolved.length,
        }),
      });

      reset();
      return true;
    },
    [dispatch, preview, reset],
  );

  return {
    link,
    handleLinkChange,
    pasteFromClipboard,
    isReading,
    preview,
    error,
    read,
    confirm,
    reset,
  };
}

export default useGoogleMapsImport;
