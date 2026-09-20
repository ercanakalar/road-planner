import { ReactNode } from 'react';

import KvkkConsentWall from './KvkkConsentWall';
import i18n from 'i18n';
import ScreenState from 'components/ui/ScreenState';
import { useAppSelector } from 'store/hook';
import {
  selectIsKvkkConsentRequired,
  selectKvkkConsent,
} from 'store/slices/kvkkSlice';

const KvkkGate = ({ children }: { children: ReactNode }) => {
  const isHydrated = useAppSelector((state) => state.kvkk.isHydrated);
  const isConsentRequired = useAppSelector(selectIsKvkkConsentRequired);
  const consent = useAppSelector(selectKvkkConsent);

  if (!isHydrated) {
    return <ScreenState variant='loading' title={i18n.t('common.gettingReady')} />;
  }

  if (isConsentRequired) {
    return <KvkkConsentWall isUpdate={consent !== null} />;
  }

  return <>{children}</>;
};

export default KvkkGate;
