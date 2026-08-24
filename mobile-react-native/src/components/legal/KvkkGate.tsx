import React, { ReactNode } from 'react';

import KvkkConsentWall from './KvkkConsentWall';
import ScreenState from 'components/ui/ScreenState';
import { useAppSelector } from 'store/hook';
import {
  selectIsKvkkConsentRequired,
  selectKvkkConsent,
} from 'store/slices/kvkkSlice';

/**
 * Holds the app back until the KVKK notice has been accepted. It renders the
 * wall *instead of* the app rather than over it, so nothing behind it starts
 * asking for a location or talking to the API before consent exists — and so
 * withdrawing consent later puts the wall straight back.
 */
const KvkkGate = ({ children }: { children: ReactNode }) => {
  const isHydrated = useAppSelector((state) => state.kvkk.isHydrated);
  const isConsentRequired = useAppSelector(selectIsKvkkConsentRequired);
  const consent = useAppSelector(selectKvkkConsent);

  if (!isHydrated) {
    return <ScreenState variant='loading' title='Getting things ready…' />;
  }

  if (isConsentRequired) {
    return <KvkkConsentWall isUpdate={consent !== null} />;
  }

  return <>{children}</>;
};

export default KvkkGate;
