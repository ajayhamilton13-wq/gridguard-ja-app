import React, { useEffect, useState } from "react";
import { Alert, Modal, Platform, View } from "react-native";
import { C } from "../theme/colors";
import { T } from "../theme/type";
import { Button } from "../components/ui";

// Alert.alert does nothing on react-native-web, so route it to an in-app modal there
let pushWebAlert = null;

if (Platform.OS === "web") {
  Alert.alert = (title, message, buttons) => {
    const list = buttons && buttons.length ? buttons : [{ text: "OK" }];
    if (pushWebAlert) pushWebAlert({ title, message, buttons: list });
    else window.alert([title, message].filter(Boolean).join("\n\n"));
  };
}

export function WebAlertHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    pushWebAlert = (a) => setQueue((q) => [...q, a]);
    return () => {
      pushWebAlert = null;
    };
  }, []);

  const current = queue[0];
  if (!current) return null;

  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: "rgba(46,32,22,0.45)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: C.bg, borderRadius: 24, padding: 22, gap: 10 }}>
          <T w="b" size={18}>
            {current.title}
          </T>
          {!!current.message && (
            <T size={14} color={C.muted} style={{ lineHeight: 21 }}>
              {current.message}
            </T>
          )}
          {current.buttons.map((b, i) => (
            <Button
              key={i}
              label={b.text}
              height={46}
              variant={b.style === "cancel" ? "outline" : b.style === "destructive" ? "danger" : "brown"}
              onPress={() => {
                dismiss();
                b.onPress?.();
              }}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}
