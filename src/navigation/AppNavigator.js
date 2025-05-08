import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from "react-native-vector-icons/Feather";
import CreateEventScreen from "../screens/CreateEventScreen";
import EventDatesScreen from "../screens/EventDatesScreen";

const Tab = createBottomTabNavigator ();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === "CreateEvent") {
              iconName = focused ? "plus-circle" : "plus";
            } else if (route.name === "EventDates") {
              iconName = focused ? "calendar" : "calendar";
            }
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#164289",
          tabBarInactiveTintColor: "#6B7280",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopColor: "#ddd",
            borderTopWidth: 1,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{ tabBarLabel: "Create Event" }}
        />
        <Tab.Screen
          name="EventDates"
          component={EventDatesScreen}
          options={{ tabBarLabel: "Event Dates" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;