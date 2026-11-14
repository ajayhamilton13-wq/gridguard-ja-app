import React, { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SMS from "expo-sms";
import { C } from "../../theme/colors";
import { Field, T } from "../../theme/type";
import { Button, Chip } from "../../components/ui";

const TEMPLATES = [
  { label: "Power out", text: "Power outage in my area. Stay safe and conserve battery." },
  { label: "No water", text: "Water supply is out. Conserve water and check NWC updates." },
  { label: "Need help", text: "Emergency assistance needed at my location. Please respond." },
  { label: "All clear", text: "Situation has been resolved in my area. Stay safe." },
];

export default function SmsPanel() {
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState([]);

  const send = async () => {
    const recipients = numbers.split(/[,\n]/).map((n) => n.trim()).filter(Boolean);
    if (!recipients.length || !message.trim()) {
      Alert.alert("Missing info", "Add at least one number and a message.");
      return;
    }
    setSending(true);
    try {
      if (!(await SMS.isAvailableAsync())) {
        Alert.alert("SMS not available", "This device can't send text messages.");
        return;
      }
      const { result } = await SMS.sendSMSAsync(recipients, message.trim());
      if (result === "sent" || result === "unknown") {
        setLog((prev) => [{ id: Date.now(), count: recipients.length, msg: message.trim(), at: new Date() }, ...prev]);
        setNumbers("");
        setMessage("");
      }
    } catch (e) {
      Alert.alert("SMS error", e?.message || "Couldn't open your messages app.");
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
      <T size={13} color={C.muted}>
        Opens your messages app with the text filled in. Works without data.
      </T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TEMPLATES.map((t) => (
          <Chip key={t.label} label={t.label} selected={message === t.text} onPress={() => setMessage(t.text)} />
        ))}
      </View>
      <Field placeholder="Phone numbers, separated by commas" value={numbers} onChangeText={setNumbers} keyboardType="phone-pad" accessibilityLabel="Phone numbers" />
      <Field
        placeholder="Your message"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={320}
        accessibilityLabel="Message"
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />
      <T size={11} color={C.muted} style={{ textAlign: "right", marginTop: -8 }}>
        {message.length}/320
      </T>
      <Button label="Send alert" icon="send" onPress={send} loading={sending} />

      {log.length > 0 && (
        <View style={{ gap: 8, marginTop: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T w="b" size={15}>
              Sent
            </T>
            <Pressable onPress={() => setLog([])} hitSlop={10} accessibilityRole="button">
              <T w="s" size={13} color={C.danger}>
                Clear
              </T>
            </Pressable>
          </View>
          {log.map((s) => (
            <View key={s.id} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12 }}>
              <Ionicons name="checkmark-circle" size={22} color={C.ok} />
              <View style={{ flex: 1 }}>
                <T w="s" size={12} color={C.muted}>
                  {s.count} {s.count === 1 ? "person" : "people"} · {s.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </T>
                <T size={13} numberOfLines={2}>
                  {s.msg}
                </T>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
