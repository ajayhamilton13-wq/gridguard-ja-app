import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarStyle } from "../hooks/useBarStyle";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "../lib/firebaseConfig";
import { C } from "../theme/colors";
import { Field, T } from "../theme/type";
import Scene from "../components/Scene";
import { Button, SectionHeader, Sheet } from "../components/ui";
import { AddResourceSheet, ShareCard } from "../components/Share";
import { useAppData } from "../context/AppData";

const EMPTY = { name: "", username: "", community: "", phone: "", supplies: "" };
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export default function YouScreen({ onSignOut }) {
  useBarStyle("light-content");
  const insets = useSafeAreaInsets();
  const { outages, resources, setUsername } = useAppData();
  const uid = firebaseAuth?.currentUser?.uid;
  const [profile, setProfile] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // null | "info" | "notes"
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (uid && firebaseDb) {
          const snap = await getDoc(doc(firebaseDb, "users", uid));
          if (snap.exists()) {
            setProfile({ ...EMPTY, ...pick(snap.data()) });
            return;
          }
        }
      } catch (e) {
        console.log("Profile load error:", e?.message);
      }
      const cached = await AsyncStorage.getItem("user_profile");
      const p = cached ? JSON.parse(cached) : null;
      if (p?.uid === uid) setProfile({ ...EMPTY, ...pick(p) });
    })();
  }, [uid]);

  const save = async (next) => {
    const user = firebaseAuth?.currentUser;
    if (!user || !firebaseDb) {
      Alert.alert("Can't save", "Your account isn't connected. Sign in again.");
      return false;
    }
    const data = { ...next, updatedAt: new Date().toISOString(), uid: user.uid, email: user.email || "" };
    try {
      await setDoc(doc(firebaseDb, "users", user.uid), data, { merge: true });
      await AsyncStorage.setItem("user_profile", JSON.stringify(data));
      setProfile({ ...EMPTY, ...pick(data) });
      setUsername(data.username || data.name || "Anonymous");
      return true;
    } catch (e) {
      Alert.alert("Can't save", e?.message || "Your profile couldn't be saved.");
      return false;
    }
  };

  const myReports = outages.reports.filter((r) => r.reporterId && r.reporterId === uid).length;
  const confirmed = outages.reports.filter((r) => (r.confirmedBy || []).includes(uid)).length;

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await onSignOut();
          } catch (e) {
            Alert.alert("Sign out failed", e?.message || "Try again.");
          }
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Scene height={190 + insets.top / 2} lights="on" />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 140 + insets.top / 2 }} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14, marginTop: -40 }}>
            <View style={styles.avatar}>
              <T w="b" size={26} color={C.cream}>
                {initials(profile.name)}
              </T>
            </View>
            <View style={{ flex: 1, paddingBottom: 6 }}>
              <T w="b" size={20} numberOfLines={1}>
                {profile.name || "Your name"}
              </T>
              <T size={13} color={C.muted} numberOfLines={1}>
                {[profile.username && `@${profile.username}`, profile.community].filter(Boolean).join(" · ") || "Add your details"}
              </T>
            </View>
            <Pressable onPress={() => setEditing("info")} hitSlop={10} style={{ paddingBottom: 10 }} accessibilityRole="button">
              <T w="s" size={13} color={C.brown}>
                Edit
              </T>
            </Pressable>
          </View>

          <View style={styles.stats}>
            <Stat value={myReports} label="My reports" />
            <View style={styles.divider} />
            <Stat value={resources.myResources.length} label="Sharing" />
            <View style={styles.divider} />
            <Stat value={confirmed} label="Confirmed" />
          </View>

          <View style={{ gap: 10 }}>
            <SectionHeader title="What you can share" action="Add" onAction={() => setAdding(true)} />
            {resources.myResources.length === 0 ? (
              <Pressable onPress={() => setAdding(true)} style={styles.emptyShare} accessibilityRole="button">
                <Ionicons name="add-circle-outline" size={22} color={C.brown} />
                <T size={13} color={C.muted} style={{ flex: 1 }}>
                  Got a generator, water or a ride? Add it so neighbours know.
                </T>
              </Pressable>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {resources.myResources.map((r) => (
                  <ShareCard key={r.id} resource={r} canRemove onRemove={resources.removeResource} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.list}>
            <Row label="Personal info" onPress={() => setEditing("info")} />
            <Row label="Emergency notes" hint="Only you" onPress={() => setEditing("notes")} />
            <Row label="Sign out" danger onPress={confirmSignOut} last />
          </View>
        </View>
      </ScrollView>

      <AddResourceSheet visible={adding} onClose={() => setAdding(false)} onAdd={resources.addResource} />
      <InfoSheet visible={editing === "info"} profile={profile} onClose={() => setEditing(null)} onSave={save} />
      <NotesSheet visible={editing === "notes"} profile={profile} onClose={() => setEditing(null)} onSave={save} />
    </View>
  );
}

function pick(p) {
  return {
    name: p.name || "",
    username: p.username || "",
    community: p.community || "",
    phone: p.phone || "",
    supplies: p.supplies || "",
  };
}

function InfoSheet({ visible, profile, onClose, onSave }) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (visible) setForm(profile);
  }, [visible, profile]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      Alert.alert("Missing info", "Enter your name and a username.");
      return;
    }
    setSaving(true);
    const ok = await onSave({
      ...form,
      name: form.name.trim(),
      username: form.username.trim(),
      community: form.community.trim(),
      phone: form.phone.trim(),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Personal info">
      <View style={{ gap: 12 }}>
        <Labeled label="Full name">
          <Field value={form.name} onChangeText={set("name")} placeholder="Your name" accessibilityLabel="Full name" />
        </Labeled>
        <Labeled label="Username">
          <Field value={form.username} onChangeText={set("username")} placeholder="Shown on chat and shared items" autoCapitalize="none" accessibilityLabel="Username" />
        </Labeled>
        <Labeled label="Community">
          <Field value={form.community} onChangeText={set("community")} placeholder="Portmore, St. Catherine" accessibilityLabel="Community" />
        </Labeled>
        <Labeled label="Phone">
          <Field value={form.phone} onChangeText={set("phone")} placeholder="876-555-0123" keyboardType="phone-pad" accessibilityLabel="Phone" />
        </Labeled>
        <Button label="Save" onPress={submit} loading={saving} style={{ marginTop: 4 }} />
      </View>
    </Sheet>
  );
}

function NotesSheet({ visible, profile, onClose, onSave }) {
  const [notes, setNotes] = useState(profile.supplies);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (visible) setNotes(profile.supplies);
  }, [visible, profile]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Emergency notes">
      <T size={13} color={C.muted} style={{ marginBottom: 12 }}>
        Medical needs, emergency contacts, anything you'd want close at hand. Saved to your account.
      </T>
      <Field
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="e.g. Insulin in the fridge. Call Mom: 876-555-0100"
        accessibilityLabel="Emergency notes"
        style={{ minHeight: 140, textAlignVertical: "top" }}
      />
      <Button
        label="Save"
        loading={saving}
        style={{ marginTop: 14 }}
        onPress={async () => {
          setSaving(true);
          const ok = await onSave({ ...profile, supplies: notes.trim() });
          setSaving(false);
          if (ok) onClose();
        }}
      />
    </Sheet>
  );
}

function Labeled({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <T w="s" size={13}>
        {label}
      </T>
      {children}
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <T w="b" size={20}>
        {value}
      </T>
      <T size={11} color={C.muted}>
        {label}
      </T>
    </View>
  );
}

function Row({ label, hint, onPress, danger, last }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: C.lineSoft }]}>
      <T w="s" size={14} color={danger ? C.danger : C.ink} style={{ flex: 1 }}>
        {label}
      </T>
      {!!hint && (
        <T size={12} color={C.muted}>
          {hint}
        </T>
      )}
      {!danger && <Ionicons name="chevron-forward" size={16} color={C.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingBottom: 30, gap: 18, minHeight: 700 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.brown, borderWidth: 4, borderColor: C.bg, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 14 },
  divider: { width: 1, backgroundColor: C.line },
  emptyShare: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14 },
  list: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20 },
  row: { height: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
});
