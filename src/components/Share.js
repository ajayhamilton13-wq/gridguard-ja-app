import React, { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import { Field, T } from "../theme/type";
import { Button, Chip, Sheet } from "./ui";
import { RESOURCE_CATEGORIES, categoryFor } from "../data/categories";
import { formatDate } from "../utils/time";

// A shared resource as a card: coloured top with icon, text, owner
export function ShareCard({ resource, canRemove, onRemove, showOwner }) {
  const cat = categoryFor(resource.text);
  const [title, ...rest] = resource.text.split(" — ");
  const confirmRemove = () =>
    Alert.alert("Remove this?", `Stop sharing "${resource.text}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onRemove(resource.id) },
    ]);

  return (
    <View style={{ width: "48%", flexGrow: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
      <View style={{ height: 64, backgroundColor: cat.color, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={cat.icon} size={26} color={cat.tint} />
        {canRemove && (
          <Pressable
            onPress={confirmRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${resource.text}`}
            style={{ position: "absolute", top: 4, right: 4, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
          >
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(251,248,243,0.9)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={14} color={C.ink} />
            </View>
          </Pressable>
        )}
      </View>
      <View style={{ padding: 10, gap: 2 }}>
        <T w="b" size={13} numberOfLines={1}>
          {title}
        </T>
        <T size={11} color={C.muted} numberOfLines={2}>
          {rest.join(" — ") || (showOwner && resource.ownerName ? `by ${resource.ownerName}` : `Added ${formatDate(resource.createdAt)}`)}
        </T>
        {showOwner && !!rest.length && !!resource.ownerName && (
          <T size={11} color={C.muted} numberOfLines={1}>
            by {resource.ownerName}
          </T>
        )}
      </View>
    </View>
  );
}

// Pick a category and add a short detail, e.g. "Generator — phone charging"
export function AddResourceSheet({ visible, onClose, onAdd }) {
  const [cat, setCat] = useState("Generator");
  const [detail, setDetail] = useState("");

  const add = () => {
    const text = cat === "Other" ? detail.trim() : detail.trim() ? `${cat} — ${detail.trim()}` : cat;
    if (!text) {
      Alert.alert("What are you sharing?", "Add a few words about it.");
      return;
    }
    onAdd(text);
    setDetail("");
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Share something">
      <T size={13} color={C.muted} style={{ marginBottom: 12 }}>
        Neighbours on GridGuard can see what you share and message you in Community.
      </T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[...RESOURCE_CATEGORIES.map((c) => ({ key: c.key, icon: c.icon })), { key: "Other", icon: "cube" }].map((c) => (
          <Chip key={c.key} label={c.key} icon={c.icon} selected={cat === c.key} onPress={() => setCat(c.key)} />
        ))}
      </View>
      <Field
        placeholder={cat === "Other" ? "What can you share?" : "Details, like phone charging or 2 drums"}
        value={detail}
        onChangeText={setDetail}
        maxLength={150}
        accessibilityLabel="Details"
        onSubmitEditing={add}
      />
      <Button label="Share it" onPress={add} style={{ marginTop: 14 }} />
    </Sheet>
  );
}
