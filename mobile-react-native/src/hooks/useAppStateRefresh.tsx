import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppStateRefetch(refetch: () => void) {
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                refetch();
            }
            setAppState(nextAppState);
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [refetch]);

    return appState;
}