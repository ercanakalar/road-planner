import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import {
  ImportedRoute,
  importGoogleMapsRoute,
} from 'services/googleMapsRouteImport';
import { showNotification } from 'services/notificationService';
import { useAppDispatch } from 'store/hook';
import { localRouteImported } from 'store/slices/localRouteSlice';

const NOT_A_ROUTE =
  'That link has no route in it. Open a route in Google Maps, use Share, and paste the link it gives you.';

/**
 * Brings a route in from a Google Maps link.
 *
 * The link is read in two steps on purpose: what comes back is shown first and
 * only added on confirmation, because the stops have been through a geocoder
 * and a name can land somewhere other than where it was meant to.
 */
export function useGoogleMapsImport() {
  const dispatch = useAppDispatch();

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
        setError(result ? 'None of those stops could be found.' : NOT_A_ROUTE);
        return;
      }

      setPreview(result);
    } catch {
      setPreview(null);
      setError('Could not read that link. Check your connection.');
    } finally {
      setIsReading(false);
    }
  }, [isReading, link]);

  /** Adds what the preview is showing as a new route on this device. */
  const confirm = useCallback(
    (title: string) => {
      if (!preview || preview.resolved.length === 0) return false;

      dispatch(
        localRouteImported({
          title: title.trim() || 'Imported route',
          stops: preview.resolved.map(({ latitude, longitude, address }) => ({
            latitude,
            longitude,
            address,
          })),
        }),
      );

      showNotification({
        type: 'success',
        header: 'Route imported',
        message: `${preview.resolved.length} stop${
          preview.resolved.length === 1 ? '' : 's'
        } added from Google Maps.`,
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
