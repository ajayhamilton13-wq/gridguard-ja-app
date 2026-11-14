import { useCallback } from "react";
import { StatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

// Light status-bar text over the dark scene, dark text over cream screens
export function useBarStyle(style) {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(style, true);
    }, [style])
  );
}
