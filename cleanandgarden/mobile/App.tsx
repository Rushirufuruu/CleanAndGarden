import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";
import * as Notifications from "expo-notifications";

import LoginScreen from "./src/screens/LoginScreen";
import MainTabs from "./src/navigation/MainTabs";

console.log("🚀 JS cargado: App.tsx");

enableScreens(true);

const Stack = createNativeStackNavigator();

// Handler para mostrar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Tabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
