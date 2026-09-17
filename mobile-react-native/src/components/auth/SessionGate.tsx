import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import ScreenState from 'components/ui/ScreenState';
import useSessionBootstrap from 'hooks/auth/useSessionBootstrap';

const SessionGate = ({ children }: { children: ReactNode }) => {
  const isReady = useSessionBootstrap();
  const { t } = useTranslation();

  if (!isReady) {
    // The one screen that shows before the stored choice has been read, so it
    // speaks the phone's language — which is what i18next starts in anyway.
    return <ScreenState variant='loading' title={t('common.gettingReady')} />;
  }

  return <>{children}</>;
};

export default SessionGate;
