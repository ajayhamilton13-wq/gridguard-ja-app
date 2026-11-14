import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AppDataProvider, navigationRef } from "../context/AppData";
import TabBar from "./TabBar";
import NowScreen from "../screens/NowScreen";
import MapScreen from "../screens/MapScreen";
import CommunityScreen from "../screens/community/CommunityScreen";
import YouScreen from "../screens/YouScreen";
import ReportModal from "../screens/ReportModal";
import OutageSheet from "../components/OutageSheet";
import PlaceSheet from "../components/PlaceSheet";

const Tab = createBottomTabNavigator();

export default function MainTabs({ onSignOut }) {
  return (
    <AppDataProvider>
      <NavigationContainer ref={navigationRef}>
        <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
          <Tab.Screen name="Now" component={NowScreen} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Community" component={CommunityScreen} />
          <Tab.Screen name="You">{() => <YouScreen onSignOut={onSignOut} />}</Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
      <ReportModal />
      <OutageSheet />
      <PlaceSheet />
    </AppDataProvider>
  );
}
