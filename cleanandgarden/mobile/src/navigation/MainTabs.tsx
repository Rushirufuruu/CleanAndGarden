import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import AppointmentScreen from "../screens/AppointmentScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2E5430",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 8,
          height: 60,
          paddingBottom: 6,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: any;
          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Citas") iconName = focused ? "calendar" : "calendar-outline";
          else if (route.name === "Perfil") iconName = focused ? "person-circle" : "person-circle-outline";
          return <Ionicons name={iconName} size={focused ? size + 2 : size} color={color} />;
        },

      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Inicio" }}
      />
      <Tab.Screen
        name="Citas"
        component={AppointmentScreen}
        options={{ title: "Citas" }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ title: "Perfil" }}
      />
    </Tab.Navigator>
  );
}
