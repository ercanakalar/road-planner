import React from 'react';
import { LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import RootNavigator from 'navigators/RootNavigator';

import store from 'store';

LogBox.ignoreAllLogs();

function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <RootNavigator />
        <Toast />
      </NavigationContainer>
    </Provider>
  );
}

export default App;
