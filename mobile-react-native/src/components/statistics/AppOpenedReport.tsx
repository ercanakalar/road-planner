import { useEffect } from 'react';
import { Platform } from 'react-native';

import { reportUsage } from 'services/usageReporter';

// Counts a launch once consent is in place. It renders inside the KVKK gate,
// so a phone that has not consented reports nothing at all.
const AppOpenedReport = () => {
  useEffect(() => {
    reportUsage('app_opened', Platform.OS);
  }, []);

  return null;
};

export default AppOpenedReport;
