import React, { useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../theme/colors";
import { F, T } from "../../theme/type";
import { useAppData } from "../../context/AppData";

const AVATAR_COLORS = [C.sage, C.slate, C.brownMid, "#5B5470", "#8C3B3B"];
const avatarColor = (name = "") => AVATAR_COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
const time = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function ChatPanel() {
  const { chat, username } = useAppData();
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  const send = async () => {
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    const ok = await chat.sendMessage(text);
    if (!ok) setDraft(text);
  };

  const askDelete = (m) =>
    Alert.alert("Delete message?", "Remove it from the community chat.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => chat.deleteMessage(m) },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <FlatList
        ref={listRef}
        data={chat.messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 8, gap: 14, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 40 }}>
            <Ionicons name="chatbubbles-outline" size={34} color={C.tan} />
            <T w="b" size={16}>
              Start the conversation
            </T>
            <T size={13} color={C.muted} style={{ textAlign: "center" }}>
              Ask if neighbours have power, or offer help.
            </T>
          </View>
        }
        renderItem={({ item: m, index }) => {
          const self = m.username === username;
          const prev = chat.messages[index - 1];
          const first = !prev || prev.username !== m.username;
          if (self) {
            return (
              <Pressable onLongPress={() => askDelete(m)} style={{ alignSelf: "flex-end", maxWidth: "78%", alignItems: "flex-end", gap: 4 }} accessibilityHint="Press and hold to delete">
                <View
                  style={{
                    backgroundColor: m.pending ? C.card : C.brown,
                    borderWidth: m.pending ? 1.5 : 0,
                    borderStyle: "dashed",
                    borderColor: C.tan,
                    borderRadius: 20,
                    borderTopRightRadius: 6,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <T size={14} color={m.pending ? C.ink : C.cream} style={{ lineHeight: 20 }}>
                    {m.text}
                  </T>
                </View>
                <T size={11} color={C.muted}>
                  {m.pending ? "Waiting to send" : `Sent ${time(m.created_at)}`}
                </T>
              </Pressable>
            );
          }
          return (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end", maxWidth: "85%" }}>
              {first ? (
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: avatarColor(m.username), alignItems: "center", justifyContent: "center" }}>
                  <T w="b" size={13} color={C.cream}>
                    {(m.username || "?")[0].toUpperCase()}
                  </T>
                </View>
              ) : (
                <View style={{ width: 34 }} />
              )}
              <View style={{ flexShrink: 1, gap: 4 }}>
                {first && (
                  <T size={12} color={C.muted}>
                    <T w="b" size={12}>
                      {m.username}
                    </T>{" "}
                    · {time(m.created_at)}
                  </T>
                )}
                <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, borderTopLeftRadius: 6, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <T size={14} style={{ lineHeight: 20 }}>
                    {m.text}
                  </T>
                </View>
              </View>
            </View>
          );
        }}
      />
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end", paddingHorizontal: 14, paddingVertical: 10 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message your community"
          placeholderTextColor={C.muted}
          multiline
          maxLength={500}
          accessibilityLabel="Message"
          style={{
            flex: 1,
            maxHeight: 110,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 24,
            paddingHorizontal: 18,
            paddingTop: 13,
            paddingBottom: 13,
            fontFamily: F.m,
            fontSize: 14,
            color: C.ink,
          }}
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.brown, alignItems: "center", justifyContent: "center", opacity: draft.trim() ? 1 : 0.5 }}
        >
          <Ionicons name="arrow-forward" size={20} color={C.cream} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
