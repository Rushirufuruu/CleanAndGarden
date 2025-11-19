import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";
import * as Notifications from "expo-notifications";

import LoginScreen from "./src/screens/LoginScreen";
import MainTabs from "./src/navigation/MainTabs";
import ChatScreen from "./src/screens/ChatScreen";

console.log("🚀 JS cargado: App.tsx");

enableScreens(true);

const Stack = createNativeStackNavigator();

// Handler para mostrar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
  }),
});

export default function App() {
  // Solicitar permisos de notificación al iniciar
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('❌ Permisos de notificación denegados');
          return;
        }
        
        console.log('✅ Permisos de notificación concedidos');
      } catch (error) {
        console.error('Error solicitando permisos:', error);
      }
    };
    
    requestPermissions();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Tabs" component={MainTabs} />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{ 
            headerShown: true,
            title: 'Chat'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
