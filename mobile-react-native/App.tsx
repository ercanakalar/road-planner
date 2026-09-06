import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import ThemedToast from 'components/feedback/ThemedToast';
import RootNavigator from 'navigators/RootNavigator';
import linking from 'navigators/linking';
import ErrorBoundary from 'components/feedback/ErrorBoundary';
import SessionGate from 'components/auth/SessionGate';
import ConfirmProvider from 'components/feedback/ConfirmProvider';
import LocalRoadMigrationPrompt from 'components/road/LocalRoadMigrationPrompt';
import store from 'store';
import { ThemeProvider, useTheme } from 'theme';

const fonts = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
  heavy: { fontFamily: 'System', fontWeight: '800' as const },
};

const ThemedApp = () => {
  const { colors, isDark } = useTheme();

  const navigationTheme = useMemo(
    () => ({
      dark: isDark,
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
      fonts,
    }),
    [colors, isDark],
  );

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <SafeAreaProvider>
        <ErrorBoundary>
          <SessionGate>
            <ConfirmProvider>
              <NavigationContainer theme={navigationTheme} linking={linking}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <RootNavigator />
                <LocalRoadMigrationPrompt />
              </NavigationContainer>
            </ConfirmProvider>
          </SessionGate>
        </ErrorBoundary>
        <ThemedToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
