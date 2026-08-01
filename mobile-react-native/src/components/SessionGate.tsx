import React, { ReactNode } from 'react';

import ScreenState from './ScreenState';
import useSessionBootstrap from 'hooks/useSessionBootstrap';


const SessionGate = ({ children }: { children: ReactNode }) => {
  const isReady = useSessionBootstrap();

  if (!isReady) {
    return <ScreenState variant='loading' title='Getting things ready…' />;
  }

  return <>{children}</>;
};

export default SessionGate;
