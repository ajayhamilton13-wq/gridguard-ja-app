import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { C } from "../theme/colors";
import { Field, T } from "../theme/type";
import Scene from "../components/Scene";
import { Button, Chip, IconButton } from "../components/ui";
import { useAppData } from "../context/AppData";
import { currentUid, findDuplicate, hasConfirmed, isMine, reportCount } from "../hooks/useOutageReports";
import { getAddressFromCoords } from "../utils/geocode";
import { nearestParish, parishFromText } from "../utils/geo";
import { uploadOutagePhoto } from "../lib/storage";

const ISSUES = [
  { key: "no_power", label: "No power", icon: "flash", type: "power", status: "Outage" },
  { key: "flicker", label: "Flickering", icon: "pulse", type: "power", status: "Flickering" },
  { key: "no_water", label: "No water", icon: "water", type: "water", status: "No Water", waterIssue: "no_water" },
  { key: "low_pressure", label: "Low pressure", icon: "water-outline", type: "water", status: "Low Pressure", waterIssue: "low_pressure" },
];

const SINCE = [
  { key: "now", label: "Just now", mins: 0 },
  { key: "30", label: "30 min", mins: 30 },
  { key: "2h", label: "1–3 hr", mins: 120 },
  { key: "long", label: "Longer", mins: 300 },
];

export default function ReportModal() {
  const { reportOpts, closeReport, outages, location } = useAppData();
  const insets = useSafeAreaInsets();
  const visible = !!reportOpts;

  const [issueKey, setIssueKey] = useState("no_power");
  const [sinceKey, setSinceKey] = useState("now");
  const [manual, setManual] = useState(false);
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pinPlace, setPinPlace] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [sending, setSending] = useState(false);

  // Reset each time the sheet opens
  useEffect(() => {
    if (!reportOpts) return;
    setIssueKey(reportOpts.type === "water" ? "no_water" : "no_power");
    setSinceKey("now");
    setManual(false);
    setArea("");
    setStreet("");
    setPhoto(null);
    setPinPlace(null);
    if (reportOpts.coord) {
      getAddressFromCoords(reportOpts.coord.latitude, reportOpts.coord.longitude).then(setPinPlace);
    } else if (!location.coords) {
      location.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportOpts]);

  const issue = ISSUES.find((i) => i.key === issueKey);
  const point = reportOpts?.coord || location.coords;
  const whereLabel = reportOpts?.coord
    ? pinPlace?.street || "The spot you picked on the map"
    : location.coords
    ? location.street || location.label || "Your location"
    : location.status === "loading"
    ? "Finding your location…"
    : "Location is off";
  const dup = useMemo(
    () => (!manual && point ? findDuplicate(outages.reports, issue.type, point) : null),
    [manual, point, outages.reports, issue.type]
  );

  const pickPhoto = () => {
    const fromLibrary = async () => {
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
      if (!res.canceled) setPhoto(res.assets[0].uri);
    };
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera blocked", "Allow camera access in your phone settings to take a photo.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (!res.canceled) setPhoto(res.assets[0].uri);
    };
    if (Platform.OS === "web") return fromLibrary();
    Alert.alert("Add a photo", "A downed pole, a dry pipe, a dark street…", [
      { text: "Cancel", style: "cancel" },
      { text: "Choose photo", onPress: fromLibrary },
      { text: "Take photo", onPress: fromCamera },
    ]);
  };

  const send = async () => {
    if (!currentUid()) {
      Alert.alert("Sign in needed", "Sign in again to send reports.");
      return;
    }
    setSending(true);
    try {
      let coords = manual ? null : point;
      let place;
      if (manual) {
        if (!area.trim()) {
          Alert.alert("Where is it?", "Enter the community, like Portmore or Half Way Tree.");
          return;
        }
        if (Platform.OS !== "web") {
          try {
            const hits = await Location.geocodeAsync(`${street ? street + ", " : ""}${area}, Jamaica`);
            if (hits[0]) coords = { latitude: hits[0].latitude, longitude: hits[0].longitude };
          } catch {}
        }
        place = { area: area.trim(), street: street.trim() || area.trim(), community: area.trim() };
      } else {
        if (!coords) {
          Alert.alert("Location is off", "Turn on location, or type the place instead.");
          setManual(true);
          return;
        }
        place = reportOpts?.coord ? pinPlace || (await getAddressFromCoords(coords.latitude, coords.longitude)) : null;
        place = place || { area: location.label, street: location.street, community: location.parish };
      }

      // Someone already reported this nearby: confirm theirs instead of adding a duplicate
      const existing = coords ? findDuplicate(outages.reports, issue.type, coords) : null;
      if (existing) {
        if (isMine(existing) || hasConfirmed(existing)) {
          Alert.alert("Already counted", "You've already reported this outage.");
        } else {
          outages.confirmReport(existing.id);
          Alert.alert("Thanks", `Your report was added to ${reportCount(existing)} others nearby.`);
        }
        closeReport();
        return;
      }

      const since = SINCE.find((s) => s.key === sinceKey);
      const report = outages.addReport({
        type: issue.type,
        status: issue.status,
        ...(issue.waterIssue && { waterIssue: issue.waterIssue }),
        area: place.area || "My area",
        location: place.street || place.area || "",
        ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
        parish: parishFromText(place.community) || parishFromText(place.area) || nearestParish(coords),
        outageStartedAt: new Date(Date.now() - since.mins * 60000).toISOString(),
      });

      if (photo) {
        uploadOutagePhoto(currentUid(), report.id, photo)
          .then((url) => outages.updateReport(report.id, { photoUrl: url }))
          .catch((e) => Alert.alert("Photo not uploaded", e?.message || "The report was sent without the photo."));
      }
      closeReport();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeReport}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <Scene height={230} lights="mixed" />
        </View>
        <View style={[styles.topRow, { paddingTop: insets.top + 10 }]}>
          <IconButton icon="close" label="Close" onPress={closeReport} />
          <IconButton icon={photo ? "image" : "camera-outline"} label="Add a photo" onPress={pickPhoto} />
        </View>

        <ScrollView style={styles.panel} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T w="b" size={22}>
                Report an outage
              </T>
              <T size={13} color={C.muted} style={{ marginTop: 2 }} numberOfLines={1}>
                {manual ? "Typed address" : whereLabel}
              </T>
            </View>
            {dup && (
              <View style={styles.dupBadge}>
                <T w="b" size={18}>
                  {reportCount(dup)}
                </T>
                <T size={11} color={C.brown}>
                  already reported
                </T>
              </View>
            )}
          </View>

          <View style={styles.issueRow}>
            {ISSUES.map((i) => {
              const on = i.key === issueKey;
              return (
                <Pressable key={i.key} onPress={() => setIssueKey(i.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.issue}>
                  <View style={[styles.issueIcon, { backgroundColor: on ? C.brownMid : C.sand }]}>
                    <Ionicons name={i.icon} size={20} color={on ? C.cream : C.brown} />
                  </View>
                  <T w={on ? "b" : "m"} size={12} color={on ? C.ink : C.muted} style={{ textAlign: "center" }}>
                    {i.label}
                  </T>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 10 }}>
            <T w="s" size={13} color={C.muted}>
              Since when
            </T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SINCE.map((s) => (
                <Chip key={s.key} label={s.label} selected={s.key === sinceKey} onPress={() => setSinceKey(s.key)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T w="s" size={13} color={C.muted}>
                Where
              </T>
              <Pressable onPress={() => setManual(!manual)} hitSlop={10} accessibilityRole="button">
                <T w="s" size={13} color={C.brown}>
                  {manual ? (reportOpts?.coord ? "Use the map spot" : "Use my location") : "Type it instead"}
                </T>
              </Pressable>
            </View>
            {manual ? (
              <View style={{ gap: 8 }}>
                <Field placeholder="Community, like Portmore" value={area} onChangeText={setArea} accessibilityLabel="Community" />
                <Field placeholder="Street (optional)" value={street} onChangeText={setStreet} accessibilityLabel="Street" />
              </View>
            ) : (
              <View style={styles.whereRow}>
                <Ionicons name={reportOpts?.coord ? "pin" : "locate"} size={20} color={C.brown} />
                <T w="s" size={14} style={{ flex: 1 }}>
                  {whereLabel}
                </T>
              </View>
            )}
          </View>

          {!!photo && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 14 }} accessibilityLabel="Your photo" />
              <T size={13} color={C.muted} style={{ flex: 1 }}>
                Photo will be shared with your report
              </T>
              <Pressable onPress={() => setPhoto(null)} hitSlop={10} accessibilityRole="button">
                <T w="s" size={13} color={C.danger}>
                  Remove
                </T>
              </Pressable>
            </View>
          )}

          <View style={styles.trustRow}>
            <Trust icon="shield-checkmark-outline" text="Your name stays private" />
            <Trust icon="map-outline" text="Shows on neighbours' map" />
            <Trust icon="cloud-offline-outline" text="Sends when you're back online" />
          </View>
        </ScrollView>

        <View style={[styles.bar, { marginBottom: Math.max(insets.bottom, 14) }]}>
          <View style={{ flex: 1 }}>
            <T size={12} color="#EADBC8">
              {dup ? "Adds to the report nearby" : issue.type === "water" ? "Water" : "Power"}
            </T>
            <T w="b" size={18} color={C.cream}>
              {issue.label}
            </T>
          </View>
          <Button label={dup ? "Me too" : "Send report"} variant="cream" iconRight="arrow-forward" onPress={send} loading={sending} height={50} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Trust({ icon, text }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <Ionicons name={icon} size={20} color={C.brown} />
      <T w="s" size={11} color={C.brown} style={{ textAlign: "center" }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, height: 150 },
  panel: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  dupBadge: { backgroundColor: C.sand, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  issueRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 12 },
  issue: { flex: 1, alignItems: "center", gap: 6 },
  issueIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  whereRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14 },
  trustRow: { flexDirection: "row", gap: 8, paddingTop: 4 },
  bar: {
    marginHorizontal: 14,
    backgroundColor: C.brown,
    borderRadius: 28,
    paddingVertical: 12,
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
