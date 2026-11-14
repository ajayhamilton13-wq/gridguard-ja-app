import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../theme/colors";
import { T } from "../../theme/type";
import { Button } from "../../components/ui";
import { AddResourceSheet, ShareCard } from "../../components/Share";
import { useAppData } from "../../context/AppData";

export default function ResourcesPanel() {
  const { resources } = useAppData();
  const [adding, setAdding] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <T size={13} color={C.muted} style={{ flex: 1 }}>
          {resources.resources.length} {resources.resources.length === 1 ? "thing" : "things"} shared by neighbours
        </T>
        <Button label="Share" icon="add" height={40} onPress={() => setAdding(true)} />
      </View>

      {resources.resources.length === 0 ? (
        <View style={{ alignItems: "center", gap: 8, paddingVertical: 40 }}>
          <Ionicons name="cube-outline" size={34} color={C.tan} />
          <T w="b" size={16}>
            Nothing shared yet
          </T>
          <T size={13} color={C.muted} style={{ textAlign: "center" }}>
            Got a generator, water or a ride? Share it so neighbours know.
          </T>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {resources.resources.map((r) => (
            <ShareCard key={r.id} resource={r} showOwner canRemove={resources.isMine(r)} onRemove={resources.removeResource} />
          ))}
        </View>
      )}

      <AddResourceSheet visible={adding} onClose={() => setAdding(false)} onAdd={resources.addResource} />
    </ScrollView>
  );
}
