import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarStyle } from "../../hooks/useBarStyle";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../theme/colors";
import { T } from "../../theme/type";
import { useAppData } from "../../context/AppData";
import ChatPanel from "./ChatPanel";
import ResourcesPanel from "./ResourcesPanel";
import SmsPanel from "./SmsPanel";

const TABS = [
  { key: "chat", label: "Chat", icon: "chatbubble-ellipses" },
  { key: "resources", label: "Resources", icon: "cube" },
  { key: "sms", label: "SMS alert", icon: "phone-portrait" },
];

export default function CommunityScreen() {
  useBarStyle("dark-content");
  const insets = useSafeAreaInsets();
  const { chat, location, focus } = useAppData();
  const [tab, setTab] = useState("chat");
  const pending = chat.messages.filter((m) => m.pending).length;
  const area = focus.kind === "parish" ? focus.name : location.label;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, gap: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T w="b" size={26}>
            Community
          </T>
          {!!area && (
            <View style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: C.sand, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="location" size={13} color={C.ink} />
              <T w="s" size={12}>
                {area}
              </T>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{
                  flex: 1,
                  height: 72,
                  borderRadius: 18,
                  backgroundColor: on ? C.brownMid : C.card,
                  borderWidth: 1,
                  borderColor: on ? C.brownMid : C.line,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name={on ? t.icon : `${t.icon}-outline`} size={20} color={on ? C.cream : C.brown} />
                <T w={on ? "b" : "s"} size={12} color={on ? C.cream : C.ink}>
                  {t.label}
                </T>
              </Pressable>
            );
          })}
        </View>

        {chat.offline && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.sand, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Ionicons name="cloud-offline-outline" size={18} color={C.brown} />
            <T w="m" size={13} style={{ flex: 1 }}>
              {pending
                ? `You're offline. ${pending} ${pending === 1 ? "message" : "messages"} will send when you reconnect.`
                : "You're offline. Messages you send will go out when you reconnect."}
            </T>
          </View>
        )}
      </View>

      {tab === "chat" && <ChatPanel />}
      {tab === "resources" && <ResourcesPanel />}
      {tab === "sms" && <SmsPanel />}
    </View>
  );
}
