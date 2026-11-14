import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarStyle } from "../hooks/useBarStyle";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import { T } from "../theme/type";
import Scene from "../components/Scene";
import { Frosted, SectionHeader, Sheet } from "../components/ui";
import { goToMap, useAppData } from "../context/AppData";
import { isActive, reportCount, reportStart } from "../hooks/useOutageReports";
import { distanceKm, formatKm, hasCoords, parishCentre, PARISHES, reportParish } from "../utils/geo";
import { formatClock, formatTimeAgo, toIso } from "../utils/time";
import { issueLabel, placeName, toneFor } from "../utils/outageText";

const AREA_KM = 2; // "near you" when using your location
const RECENT_FIXED_MS = 6 * 3600 * 1000; // show fixed outages for 6 hours

export default function NowScreen() {
  useBarStyle("light-content");
  const insets = useSafeAreaInsets();
  const { outages, location, focus, setFocus, openReport, openOutage } = useAppData();
  const [areaSheet, setAreaSheet] = useState(false);
  const [allParishes, setAllParishes] = useState(false);

  const byParish = focus.kind === "parish";
  const centre = byParish ? parishCentre(focus.name) : location.coords;
  const areaName = byParish ? focus.name : location.label || (location.status === "denied" ? "Set your area" : "Finding you…");

  const data = useMemo(() => {
    const reports = outages.reports;
    const inArea = (r) => (byParish ? reportParish(r) === focus.name : centre && distanceKm(centre, r) <= AREA_KM);
    const here = reports.filter((r) => isActive(r) && inArea(r));
    const power = here.filter((r) => r.type === "power");
    const water = here.filter((r) => r.type === "water");
    const starts = here.map((r) => toIso(reportStart(r))).filter(Boolean).sort();

    const nearby = reports
      .filter((r) => hasCoords(r) || r.parish)
      .filter((r) => isActive(r) || Date.now() - new Date(r.resolvedAt || r.createdAt).getTime() < RECENT_FIXED_MS)
      .map((r) => ({ r, d: centre ? distanceKm(centre, r) : Infinity }))
      .sort((a, b) => isActive(b.r) - isActive(a.r) || (isFinite(a.d) && isFinite(b.d) ? a.d - b.d : isFinite(a.d) ? -1 : isFinite(b.d) ? 1 : 0))
      .slice(0, 12);

    const counts = PARISHES.map((p) => ({
      ...p,
      out: reports.filter((r) => isActive(r) && reportParish(r) === p.name).length,
    })).sort((a, b) => b.out - a.out || a.name.localeCompare(b.name));

    return { power, water, since: starts[0], nearby, counts };
  }, [outages.reports, byParish, focus, centre]);

  const powerTone = data.power.length ? { word: data.power.some((r) => r.status === "Outage") ? "Out" : "Flicker", color: C.powerText } : { word: "On", color: C.okText };
  const waterTone = data.water.length ? { word: data.water.some((r) => r.status === "No Water") ? "Out" : "Low", color: C.waterText } : { word: "On", color: C.okText };
  const parishes = allParishes ? data.counts : data.counts.slice(0, 4);
  const BLOCKS = [C.brownDark, C.brownMid, C.slate, C.sage];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Scene height={250 + insets.top / 2} lights={data.power.length ? "mixed" : "on"} />
      </View>
      <View style={[styles.topRow, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => setAreaSheet(true)} accessibilityRole="button" accessibilityLabel={`Area: ${areaName}. Change`}>
          <Frosted style={styles.pill}>
            <Ionicons name={byParish ? "business-outline" : "location"} size={15} color={C.ink} />
            <T w="s" size={13}>
              {areaName}
            </T>
            <Ionicons name="chevron-down" size={14} color={C.muted} />
          </Frosted>
        </Pressable>
        <Frosted style={styles.pill}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: outages.live ? C.ok : C.muted }} />
          <T w="s" size={13}>
            {outages.live ? "Live" : "Offline"}
          </T>
        </Frosted>
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={{ padding: 18, gap: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12 }}>
          <T w="b" size={20}>
            {byParish ? `Right now in ${focus.name}` : "Right now near you"}
          </T>
          <Pressable onPress={() => setAreaSheet(true)} style={styles.areaField} accessibilityRole="button">
            <Ionicons name="location-outline" size={18} color={C.muted} />
            <T w="m" size={14} style={{ flex: 1 }}>
              {byParish ? focus.name : location.street ? `${location.street}, ${location.label}` : areaName}
            </T>
            <T w="s" size={13} color={C.brown}>
              Change
            </T>
          </Pressable>
        </View>

        <View style={styles.tiles}>
          <Tile icon="flash" iconColor={C.power} label="Power" value={powerTone.word} valueColor={powerTone.color} />
          <Tile icon="water" iconColor={C.water} label="Water" value={waterTone.word} valueColor={waterTone.color} />
          <Tile icon="time-outline" iconColor={C.brown} label="Since" value={data.since ? formatClock(data.since) : "—"} valueColor={C.muted} />
          <Pressable onPress={() => openReport()} style={[styles.tile, { backgroundColor: C.brownMid, borderColor: C.brownMid }]} accessibilityRole="button">
            <Ionicons name="add" size={22} color={C.cream} />
            <T w="b" size={12} color={C.cream}>
              Report
            </T>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Nearby outages" action="See map" onAction={() => goToMap({})} />
          {data.nearby.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="sunny-outline" size={22} color={C.ok} />
              <T size={13} color={C.muted} style={{ flex: 1 }}>
                No outages reported nearby. If yours is out, be the first to report it.
              </T>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 18 }} style={{ marginRight: -18 }}>
              {data.nearby.map(({ r, d }) => {
                const tone = toneFor(r);
                return (
                  <Pressable key={r.id} onPress={() => openOutage(r.id)} style={styles.card} accessibilityRole="button">
                    <View style={[styles.cardTop, { backgroundColor: tone.block }]}>
                      {!!r.photoUrl && <Image source={{ uri: r.photoUrl }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />}
                      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <T w="b" size={11} color={tone.text}>
                          {issueLabel(r)}
                        </T>
                      </View>
                    </View>
                    <View style={{ padding: 10, gap: 3 }}>
                      <T w="b" size={13} numberOfLines={1}>
                        {placeName(r)}
                      </T>
                      <T size={11} color={C.muted} numberOfLines={1}>
                        {[isFinite(d) ? formatKm(d) : reportParish(r), isActive(r) ? `${reportCount(r)} ${reportCount(r) === 1 ? "report" : "reports"}` : formatTimeAgo(r.resolvedAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </T>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <SectionHeader title="Parishes" action={allParishes ? "Show less" : "See all"} onAction={() => setAllParishes(!allParishes)} />
          <View style={styles.parishGrid}>
            {parishes.map((p, i) => (
              <Pressable
                key={p.name}
                onPress={() => goToMap({ parish: p.name })}
                style={[styles.parish, { backgroundColor: BLOCKS[i % BLOCKS.length] }]}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${p.out ? `${p.out} outages` : "clear"}. Show on map`}
              >
                <T w="b" size={12} color={C.cream} numberOfLines={1}>
                  {p.name}
                </T>
                <T size={11} color="#F1E6D8">
                  {p.out ? `${p.out} out` : "Clear"}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={areaSheet} onClose={() => setAreaSheet(false)} title="Your area">
        <AreaOption
          icon="locate"
          label="Use my location"
          hint={location.label || (location.status === "denied" ? "Location is off" : "")}
          selected={!byParish}
          onPress={() => {
            setFocus({ kind: "gps" });
            location.refresh();
            setAreaSheet(false);
          }}
        />
        {PARISHES.map((p) => (
          <AreaOption
            key={p.name}
            icon="business-outline"
            label={p.name}
            selected={byParish && focus.name === p.name}
            onPress={() => {
              setFocus({ kind: "parish", name: p.name });
              setAreaSheet(false);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

function Tile({ icon, iconColor, label, value, valueColor }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <T w="s" size={12}>
        {label}
      </T>
      <T w="b" size={11} color={valueColor} numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

function AreaOption({ icon, label, hint, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.option} accessibilityRole="button" accessibilityState={{ selected }}>
      <Ionicons name={icon} size={18} color={C.brown} />
      <View style={{ flex: 1 }}>
        <T w="s" size={15}>
          {label}
        </T>
        {!!hint && (
          <T size={12} color={C.muted}>
            {hint}
          </T>
        )}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={20} color={C.brownMid} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, height: 175 },
  pill: { height: 40, borderRadius: 20, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6 },
  panel: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  areaField: { height: 50, borderRadius: 25, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, minHeight: 86, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  card: { width: 156, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  cardTop: { height: 80, justifyContent: "flex-end", padding: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  empty: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14 },
  parishGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  parish: { width: "23%", flexGrow: 1, height: 66, borderRadius: 14, padding: 8, justifyContent: "flex-end" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.lineSoft },
});
