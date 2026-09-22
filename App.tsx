import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { notificationService } from './src/services/notificationService';
import { locationService } from './src/services/locationService';
import { authService } from './src/services/authService';
import { WaitingScreen } from './src/screens/WaitingScreen';
import { BroadcasterScreen } from './src/screens/BroadcasterScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { COLORS } from './src/utils/constants';

export type RootStackParamList = {
  Waiting: undefined;
  Broadcaster: undefined;
  Auth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  // Initialize services
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize auth
        await authService.initialize();

        // Request notification permissions
        await notificationService.requestPermissions();
        await notificationService.configureChannels();

        // Register background task
        await locationService.registerBackgroundTask();

        // Check location permissions
        await locationService.requestPermissions();

        setIsReady(true);
      } catch (err) {
        console.error('Error initializing app:', err);
        setIsReady(true); // Continue even if some services fail
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return null; // Or a loading screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="Waiting"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Waiting" component={WaitingScreen} />
          <Stack.Screen name="Broadcaster" component={BroadcasterScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
