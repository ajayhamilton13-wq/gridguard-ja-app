import React from "react";
import { Text, TextInput } from "react-native";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { C } from "./colors";

export const FONT_FILES = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
};

// Custom fonts ignore fontWeight on Android, so each weight is its own family
export const F = {
  r: "PlusJakartaSans_400Regular",
  m: "PlusJakartaSans_500Medium",
  s: "PlusJakartaSans_600SemiBold",
  b: "PlusJakartaSans_700Bold",
};

// <T w="b" size={18}>Heading</T>
export function T({ w = "r", size = 14, color = C.ink, style, ...props }) {
  return <Text {...props} style={[{ fontFamily: F[w], fontSize: size, color }, style]} />;
}

export function Field({ style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={C.muted}
      {...props}
      style={[
        {
          fontFamily: F.m,
          fontSize: 15,
          color: C.ink,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 13,
        },
        style,
      ]}
    />
  );
}
