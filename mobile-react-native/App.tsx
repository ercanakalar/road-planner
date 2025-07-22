import React from 'react';
import { LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator from 'navigators/RootNavigator';

import store from 'store';

LogBox.ignoreAllLogs();

function App() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <RootNavigator />
          <Toast />
        </NavigationContainer>
      </GestureHandlerRootView>
    </Provider>
  );
}

export default App;
