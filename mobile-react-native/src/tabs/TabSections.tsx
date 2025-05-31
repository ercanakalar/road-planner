import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from 'screens/SettingsScreen';
import ProfileScreen from 'screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabSections = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name='Home'
        component={HomeScreen}
        options={{
          headerStyle: {
            backgroundColor: '#f4511e',
          },
          tabBarActiveBackgroundColor: '#f0edf8',
          tabBarInactiveBackgroundColor: '#3e2465',
        }}
      />
      <Tab.Screen
        name='Settings'
        component={SettingsScreen}
        options={{ tabBarActiveBackgroundColor: '#f0edf8' }}
      />
      <Tab.Screen
        name='Profile'
        component={ProfileScreen}
        options={{ tabBarActiveBackgroundColor: '#f0edf8' }}
      />
    </Tab.Navigator>
  );
};

export default TabSections;
