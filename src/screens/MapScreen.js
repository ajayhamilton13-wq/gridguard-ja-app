import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarStyle } from "../hooks/useBarStyle";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { C } from "../theme/colors";
import { F, T } from "../theme/type";
import { Button, Frosted, IconButton } from "../components/ui";
import WebMap from "../components/WebMap";
import { useAppData } from "../context/AppData";
import { NWC_PUMP_STATIONS, POWER_STATIONS } from "../data/stations";
import { hasConfirmed, isActive, isMine, reportCount, reportStart } from "../hooks/useOutageReports";
import { hasCoords, parishCentre, PARISHES } from "../utils/geo";
import { formatClock } from "../utils/time";
import { issueLabel, placeName, toneFor } from "../utils/outageText";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "power", label: "Power" },
  { key: "water", label: "Water" },
  { key: "stations", label: "Stations" },
];
const STATIONS = [
  ...POWER_STATIONS.map((s) => ({ ...s, kind: "power" })),
  ...NWC_PUMP_STATIONS.map((s) => ({ ...s, kind: "water" })),
];

export default function MapScreen() {
  useBarStyle("light-content");
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { outages, location, openReport, openOutage, setOpenPlace } = useAppData();
    const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [mapFocus, setMapFocus] = useState(null);
  const [locateAt, setLocateAt] = useState(0);

  const focusTo = (latitude, longitude, zoom = 14) => setMapFocus({ latitude, longitude, zoom, at: Date.now() });

  // Jumps from other tabs: { outageId } or { parish }
  useEffect(() => {
    const p = route.params;
    if (!p) return;
    if (p.outageId) {
      const r = outages.reports.find((x) => x.id === p.outageId);
      setSelectedId(p.outageId);
      if (r && hasCoords(r)) focusTo(r.latitude, r.longitude, 15);
    } else if (p.parish) {
      const c = parishCentre(p.parish);
      setSelectedId(null);
      if (c) focusTo(c.latitude, c.longitude, 11);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.at]);

  // First zoom to the user once their location is known
  const zoomedToUser = useRef(false);
  useEffect(() => {
    if (location.coords && !zoomedToUser.current && !route.params) {
      zoomedToUser.current = true;
      focusTo(location.coords.latitude, location.coords.longitude, 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.coords]);

  const shownOutages = useMemo(
    () =>
      outages.reports.filter(
        (r) => hasCoords(r) && isActive(r) && (filter === "all" || filter === r.type)
      ),
    [outages.reports, filter]
  );
  const shownStations = STATIONS.filter((s) => filter === "all" || filter === "stations" || filter === s.kind);
  const selected = outages.reports.find((r) => r.id === selectedId);

  const runSearch = async () => {
    const q = search.trim().toLowerCase();
    Keyboard.dismiss();
    if (!q) return;
    const parish = PARISHES.find((p) => p.name.toLowerCase().includes(q.replace("saint", "st.")));
    if (parish) return focusTo(parish.latitude, parish.longitude, 11);
    const report = outages.reports.find((r) => hasCoords(r) && `${r.area} ${r.location}`.toLowerCase().includes(q));
    if (report) return focusTo(report.latitude, report.longitude, 15);
    if (Platform.OS !== "web") {
      try {
        const hits = await Location.geocodeAsync(`${search}, Jamaica`);
        if (hits[0]) return focusTo(hits[0].latitude, hits[0].longitude, 14);
      } catch {}
    }
    Alert.alert("Not found", `Couldn't find "${search}". Try a parish or community name.`);
  };

  const locateMe = async () => {
    const loc = await location.refresh();
    if (loc?.coords) focusTo(loc.coords.latitude, loc.coords.longitude, 15);
    else setLocateAt(Date.now());
  };

  const onStation = (id) => setOpenPlace(STATIONS.find((s) => s.id === id) || null);

  return (
    <View style={{ flex: 1, backgroundColor: "#1F2A22" }}>
      <WebMap
        outages={shownOutages.map((r) => ({ id: r.id, latitude: r.latitude, longitude: r.longitude, radius: r.radius || 400, color: toneFor(r).color, selected: r.id === selectedId }))}
        stations={shownStations.map((s) => ({
          id: s.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          color: s.kind === "water" ? C.slate : s.type === "independent" ? C.indep : C.brownMid,
          glyph: s.kind === "water" ? "\u{1F4A7}" : "⚡",
        }))}
        focus={mapFocus}
        locateAt={locateAt}
        onLongPress={(coord) => openReport({ coord })}
        onOutagePress={setSelectedId}
        onStationPress={onStation}
      />

      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 14, gap: 10 }} pointerEvents="box-none">
        <Frosted style={styles.search}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={runSearch}
            returnKeyType="search"
            placeholder="Search a parish or community"
            placeholderTextColor={C.muted}
            accessibilityLabel="Search the map"
            style={{ flex: 1, fontFamily: F.m, fontSize: 14, color: C.ink, paddingVertical: 0 }}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search" hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </Pressable>
          )}
        </Frosted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
          {FILTERS.map((f) => {
            const on = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.filter, { backgroundColor: on ? C.brownMid : "rgba(251,248,243,0.94)" }]}
              >
                <T w={on ? "b" : "s"} size={13} color={on ? C.cream : C.ink}>
                  {f.label}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        <IconButton icon="navigate" label="Go to my location" onPress={locateMe} frosted={false} style={{ alignSelf: "flex-end" }} />
        {selected ? (
          <View style={styles.card}>
            <Pressable onPress={() => openOutage(selected.id)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }} accessibilityRole="button" accessibilityLabel="Open details">
              <View style={[styles.cardIcon, { backgroundColor: toneFor(selected).bg }]}>
                <Ionicons name={selected.type === "water" ? "water" : "flash"} size={20} color={toneFor(selected).color} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="b" size={17} color={C.cream} numberOfLines={1}>
                  {placeName(selected)}
                </T>
                <T size={12} color="#EADBC8">
                  {issueLabel(selected)} · {reportCount(selected)} {reportCount(selected) === 1 ? "report" : "reports"} · since {formatClock(reportStart(selected))}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#EADBC8" />
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                style={{ flex: 1 }}
                height={46}
                variant="cream"
                label={isMine(selected) ? "Yours" : hasConfirmed(selected) ? "Confirmed" : "Me too"}
                disabled={isMine(selected) || hasConfirmed(selected)}
                onPress={() => outages.confirmReport(selected.id)}
              />
              <Button
                style={{ flex: 1 }}
                height={46}
                variant="outlineLight"
                label="It's back"
                onPress={() => {
                  outages.resolveReport(selected);
                  setSelectedId(null);
                }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.hint}>
            <Ionicons name="hand-left-outline" size={18} color={C.brown} />
            <T size={13} style={{ flex: 1 }}>
              {Platform.OS === "web" ? "Right-click" : "Press and hold"} the map to report an outage there. Tap a circle for details.
            </T>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { height: 50, borderRadius: 25, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  filter: { height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: "center" },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: C.cream, alignItems: "center", justifyContent: "center" },
  station: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: C.cream, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 12, right: 12, bottom: 12, gap: 10 },
  card: { backgroundColor: C.brown, borderRadius: 28, padding: 16, gap: 14 },
  cardIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  hint: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 20, padding: 14 },
});
