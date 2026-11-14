import React from "react";
import { Alert, Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import { T } from "../theme/type";
import { Button, Sheet } from "./ui";
import Scene from "./Scene";
import { goToMap, useAppData } from "../context/AppData";
import {
  canDelete,
  hasConfirmed,
  isActive,
  isMine,
  reportCount,
  reportStart,
} from "../hooks/useOutageReports";
import { distanceKm, formatKm, hasCoords, reportParish } from "../utils/geo";
import { formatClock, formatTimeAgo } from "../utils/time";
import { iconFor, issueLabel, placeName, toneFor } from "../utils/outageText";

// Details for one outage, with Me too / It's back / Show on map / Delete
export default function OutageSheet() {
  const { outages, openOutageId, closeOutage, location } = useAppData();
  const r = outages.reports.find((x) => x.id === openOutageId);
  if (!r) return null;

  const tone = toneFor(r);
  const active = isActive(r);
  const mine = isMine(r);
  const confirmed = hasConfirmed(r);
  const dist = location.coords ? distanceKm(location.coords, r) : Infinity;
  const count = reportCount(r);

  const confirmDelete = () =>
    Alert.alert("Delete report?", "This removes it for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          outages.removeReport(r.id);
          closeOutage();
        },
      },
    ]);

  return (
    <Sheet visible onClose={closeOutage}>
      <View style={{ borderRadius: 22, overflow: "hidden", height: 170, marginBottom: 16, backgroundColor: tone.block }}>
        {r.photoUrl ? (
          <Image source={{ uri: r.photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityLabel="Photo from the report" />
        ) : (
          <Scene height={170} lights={active ? "mixed" : "on"} />
        )}
        <View style={{ position: "absolute", left: 12, top: 12, flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: tone.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
          <Ionicons name={iconFor(r)} size={14} color={tone.color} />
          <T w="b" size={12} color={tone.text}>
            {issueLabel(r)}
          </T>
        </View>
      </View>

      <T w="b" size={22}>
        {placeName(r)}
      </T>
      <T size={14} color={C.muted} style={{ marginTop: 2 }}>
        {[r.area !== placeName(r) ? r.area : null, reportParish(r)].filter(Boolean).join(", ")}
      </T>

      <View style={{ flexDirection: "row", marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 12 }}>
        <Fact icon="people" value={String(count)} label={count === 1 ? "report" : "reports"} />
        <Fact icon="time" value={formatClock(reportStart(r))} label={active ? "since" : "started"} />
        <Fact icon="navigate" value={isFinite(dist) ? formatKm(dist) : "—"} label="from you" />
      </View>

      <T size={13} color={C.muted} style={{ marginTop: 12 }}>
        Reported {formatTimeAgo(r.createdAt) || r.time || ""}
        {mine ? " by you" : ""}
        {!active && r.resolvedAt ? ` · fixed ${formatClock(r.resolvedAt)}` : ""}
      </T>

      <View style={{ gap: 10, marginTop: 18 }}>
        {active && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              style={{ flex: 1 }}
              label={mine ? "You reported this" : confirmed ? "You confirmed" : "Me too"}
              icon={mine || confirmed ? "checkmark" : "hand-left"}
              disabled={mine || confirmed}
              onPress={() => outages.confirmReport(r.id)}
            />
            <Button style={{ flex: 1 }} label="It's back" variant="outline" icon="checkmark-circle" onPress={() => outages.resolveReport(r)} />
          </View>
        )}
        {hasCoords(r) && (
          <Button
            label="Show on map"
            variant="outline"
            icon="map"
            onPress={() => {
              closeOutage();
              goToMap({ outageId: r.id });
            }}
          />
        )}
        {canDelete(r) && <Button label="Delete report" variant="danger" icon="trash-outline" onPress={confirmDelete} />}
      </View>
    </Sheet>
  );
}

function Fact({ icon, value, label }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Ionicons name={`${icon}-outline`} size={18} color={C.brown} />
      <T w="b" size={14}>
        {value || "—"}
      </T>
      <T size={11} color={C.muted}>
        {label}
      </T>
    </View>
  );
}
