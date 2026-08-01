import React from 'react';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

import RootNavigator from 'navigators/RootNavigator';
import ErrorBoundary from 'components/ErrorBoundary';
import SessionGate from 'components/SessionGate';
import LocalRoadMigrationPrompt from 'components/LocalRoadMigrationPrompt';
import store from 'store';
import { colors } from 'theme';

/*
 * `LogBox.ignoreAllLogs()` used to sit here. It hid every warning the runtime
 * raised — including the rules-of-hooks and key warnings that pointed at real
 * bugs — so it is gone.
 */

const navigationTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

function App() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ErrorBoundary>
            <SessionGate>
              <NavigationContainer theme={navigationTheme}>
                <StatusBar style='dark' />
                <RootNavigator />
                {/* Inside the container: it navigates to Settings. */}
                <LocalRoadMigrationPrompt />
              </NavigationContainer>
            </SessionGate>
          </ErrorBoundary>
          {/* Outside the navigator so toasts survive screen transitions. */}
          <Toast />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

export default App;
