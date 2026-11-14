import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import { T } from "../theme/type";

const ICONS = { Now: "flash", Map: "map", Community: "chatbubble-ellipses", You: "person" };

export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: C.card,
        borderTopWidth: 1,
        borderTopColor: C.line,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingHorizontal: 10,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? C.cream : C.muted;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            style={{
              flex: 1,
              height: 56,
              marginHorizontal: 4,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              backgroundColor: focused ? C.brownMid : "transparent",
            }}
          >
            <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={20} color={color} />
            <T w="s" size={11} color={color}>
              {route.name}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
