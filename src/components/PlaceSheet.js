import React from "react";
import { Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import { T } from "../theme/type";
import { Button, Sheet } from "./ui";
import { useAppData } from "../context/AppData";

// Details for a JPS / independent power station or NWC site
export default function PlaceSheet() {
  const { openPlace: place, setOpenPlace } = useAppData();
  if (!place) return null;
  const isPower = !!place.type;
  const kind = isPower ? (place.type === "jps" ? "JPS power station" : "Independent power plant") : "NWC water site";
  const close = () => setOpenPlace(null);

  return (
    <Sheet visible onClose={close}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isPower ? C.powerBg : C.waterBg, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={isPower ? "flash" : "water"} size={22} color={isPower ? C.power : C.water} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="s" size={12} color={C.muted}>
            {kind}
          </T>
          <T w="b" size={18}>
            {place.name}
          </T>
        </View>
      </View>
      <Row icon="location-outline" text={`Parish: ${place.parish}`} />
      <Row icon="time-outline" text={`Hours: ${place.hours}`} />
      {!!place.notes && <Row icon="information-circle-outline" text={place.notes} />}
      <View style={{ gap: 10, marginTop: 16 }}>
        {!!place.phone && (
          <Button label={`Call ${place.phone}`} icon="call" onPress={() => Linking.openURL(`tel:${place.phone.replace(/[^\d+]/g, "")}`)} />
        )}
        <Button label="Close" variant="outline" onPress={close} />
      </View>
    </Sheet>
  );
}

function Row({ icon, text }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineSoft }}>
      <Ionicons name={icon} size={18} color={C.brown} />
      <T size={14} style={{ flex: 1, lineHeight: 20 }}>
        {text}
      </T>
    </View>
  );
}
