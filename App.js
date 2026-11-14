import React, { useEffect, useState } from "react";
import { Platform, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firebaseAuth } from "./src/lib/firebaseConfig";
import { WebAlertHost } from "./src/utils/webAlert";
import { FONT_FILES } from "./src/theme/type";
import { C } from "./src/theme/colors";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import MainTabs from "./src/navigation/MainTabs";

export default function App() {
  const [fontsLoaded] = useFonts(FONT_FILES);
  const [authUser, setAuthUser] = useState(null);
  const [isAuthHydrated, setIsAuthHydrated] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) {
      setIsAuthHydrated(true);
      return undefined;
    }
    return firebaseAuth.onAuthStateChanged((user) => {
      setAuthUser(user);
      setIsAuthHydrated(true);
    });
  }, []);

  const handleSignOut = async () => {
    if (!firebaseAuth) throw new Error("Firebase Authentication is not configured.");
    await firebaseAuth.signOut();
    try {
      await AsyncStorage.multiRemove(["user_profile", "userEmail"]);
    } catch (error) {
      console.error("Signed out, but local profile cleanup failed:", error);
    }
  };

  if (!isAuthHydrated || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.brownDark }} />;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {authUser ? (
        // key resets every tab's state when a different person signs in
        <MainTabs key={authUser.uid} onSignOut={handleSignOut} />
      ) : (
        <WelcomeScreen onFinish={setAuthUser} />
      )}
      {Platform.OS === "web" && <WebAlertHost />}
    </SafeAreaProvider>
  );
}
