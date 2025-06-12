import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppStateGoBack(navigate: any) {
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                navigate.goBack();
            }
            setAppState(nextAppState);
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [navigate]);

    return appState;
}