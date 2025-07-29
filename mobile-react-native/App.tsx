import React from 'react';
import { LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator from 'navigators/RootNavigator';

import store from 'store';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { KeyboardAvoidingView, Platform } from 'react-native';

LogBox.ignoreAllLogs();

function App() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <BottomSheetModalProvider>
            <NavigationContainer>
              <RootNavigator />
              <Toast />
            </NavigationContainer>
          </BottomSheetModalProvider>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Provider>
  );
}

export default App;
