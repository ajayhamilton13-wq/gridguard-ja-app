import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from "../lib/firebaseConfig";
import { getAddressFromCoords, getCurrentCoords } from "../utils/geocode";
import { C } from "../theme/colors";
import { Field, T } from "../theme/type";
import Scene from "../components/Scene";
import { Button, Frosted, IconButton, Sheet } from "../components/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PILLS = [
  { icon: "flash", label: "Power\noutages", x: 0.4, y: 0.34, bg: C.brownMid },
  { icon: "water", label: "Water\nupdates", x: 0.05, y: 0.45, bg: C.slate },
  { icon: "people", label: "Neighbours\nnearby", x: 0.48, y: 0.55, bg: C.sage },
  { icon: "cube", label: "Share\nresources", x: 0.14, y: 0.65, bg: C.brownMid },
];

const TERMS = [
  "GridGuard JA helps Jamaican communities report and track power and water outages.",
  "Give accurate information when you report.",
  "Your location is used to find your community and to place your reports on the map. Reports, with their map location, are visible to other users. Your name is not shown on reports.",
  "Community chat messages and shared resources are visible to all users.",
  "Don't misuse reporting or chat.",
  "GridGuard JA is not affiliated with JPS, NWC or any utility company.",
];

export default function WelcomeScreen({ onFinish }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(null); // null = welcome, "create" | "signin"

  if (!mode) {
    return (
      <View style={{ flex: 1, backgroundColor: C.brownDark }}>
        <View style={StyleSheet.absoluteFill}>
          <Scene height={height} lights="mixed" />
        </View>
        <View style={{ paddingTop: insets.top + 40, paddingHorizontal: 28, gap: 10 }}>
          <T w="b" size={13} color={C.glow} style={{ letterSpacing: 1.5 }}>
            GRIDGUARD JA
          </T>
          <T w="b" size={36} color={C.cream} style={{ lineHeight: 40 }}>
            Know when the light comes back
          </T>
          <T size={15} color="#EADBC8" style={{ lineHeight: 22 }}>
            Outages, water and neighbours — all in one place
          </T>
        </View>
        {PILLS.map((p) => (
          <Frosted key={p.label} style={[styles.pill, { left: p.x * width, top: p.y * height }]}>
            <View style={[styles.pillIcon, { backgroundColor: p.bg }]}>
              <Ionicons name={p.icon} size={18} color={C.cream} />
            </View>
            <T w="s" size={13} style={{ lineHeight: 16 }}>
              {p.label}
            </T>
          </Frosted>
        ))}
        <Frosted dark style={[styles.bottom, { bottom: Math.max(insets.bottom, 16) + 12 }]}>
          <Button label="Create account" variant="cream" iconRight="arrow-forward" height={56} onPress={() => setMode("create")} />
          <Button label="I already have an account" variant="outlineLight" height={46} style={{ borderColor: "transparent" }} onPress={() => setMode("signin")} />
        </Frosted>
      </View>
    );
  }

  return <AuthForm mode={mode} setMode={setMode} onFinish={onFinish} />;
}

function AuthForm({ mode, setMode, onFinish }) {
  const insets = useSafeAreaInsets();
  const create = mode === "create";
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [useLocation, setUseLocation] = useState(true);
  const [terms, setTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password || (create && (!name.trim() || !username.trim()))) {
      Alert.alert("Missing info", create ? "Enter your name, username, email and password." : "Enter your email and password.");
      return;
    }
    if (!EMAIL.test(cleanEmail)) return Alert.alert("Check your email", "That email address doesn't look right.");
    if (password.length < 6) return Alert.alert("Password too short", "Use at least 6 characters.");
    if (create && !terms) return Alert.alert("Terms", "Accept the terms to create an account.");
    if (!isFirebaseConfigured || !firebaseAuth || !firebaseDb) {
      return Alert.alert("Not set up", "Accounts need Firebase to be configured in the app's .env file.");
    }

    setBusy(true);
    try {
      const cred = create
        ? await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password)
        : await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
      const uid = cred.user.uid;
      const ref = doc(firebaseDb, "users", uid);
      const now = new Date().toISOString();
      let profile;

      if (create) {
        let community = "";
        if (useLocation) {
          try {
            const coords = await getCurrentCoords();
            if (coords) community = (await getAddressFromCoords(coords.latitude, coords.longitude)).community || "";
          } catch {}
        }
        profile = { uid, email: cleanEmail, name: name.trim(), username: username.trim(), community, phone: "", supplies: "", createdAt: now, updatedAt: now };
        await setDoc(ref, profile, { merge: true });
      } else {
        const snap = await getDoc(ref);
        profile = snap.exists()
          ? { ...snap.data(), uid, email: cleanEmail }
          : { uid, email: cleanEmail, name: cred.user.displayName || "", username: "", community: "", phone: "", supplies: "", createdAt: now, updatedAt: now };
        if (!snap.exists()) await setDoc(ref, profile, { merge: true });
      }

      await AsyncStorage.setItem("user_profile", JSON.stringify(profile));
      onFinish(cred.user);
    } catch (e) {
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "There's already an account with that email. Try signing in."
          : e?.code === "auth/invalid-credential" || e?.code === "auth/wrong-password" || e?.code === "auth/user-not-found"
          ? "That email and password don't match."
          : e?.message || "Something went wrong. Try again.";
      Alert.alert(create ? "Couldn't create account" : "Couldn't sign in", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Scene height={220} lights="on" />
      </View>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 18, height: 160 }}>
        <IconButton icon="arrow-back" label="Back" onPress={() => setMode(null)} />
      </View>
      <ScrollView style={styles.panel} contentContainerStyle={{ padding: 22, gap: 14, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <T w="b" size={24}>
          {create ? "Create your account" : "Welcome back"}
        </T>
        <View style={styles.switch}>
          {[
            ["create", "Create account"],
            ["signin", "Sign in"],
          ].map(([m, label]) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.switchBtn, mode === m && { backgroundColor: C.card }]} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
              <T w={mode === m ? "b" : "m"} size={14} color={mode === m ? C.ink : C.muted}>
                {label}
              </T>
            </Pressable>
          ))}
        </View>
        {create && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field style={{ flex: 1 }} placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" accessibilityLabel="Full name" />
            <Field style={{ flex: 1 }} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" accessibilityLabel="Username" />
          </View>
        )}
        <Field placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="Email" />
        <Field placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} accessibilityLabel="Password" />
        {create && (
          <>
            <Check checked={useLocation} onToggle={() => setUseLocation(!useLocation)} label="Use my location to find my community and nearby outages" />
            <Check
              checked={terms}
              onToggle={() => setTerms(!terms)}
              label={
                <T size={14}>
                  I agree to the{" "}
                  <T w="b" size={14} color={C.brown} onPress={() => setTermsOpen(true)} style={{ textDecorationLine: "underline" }}>
                    terms
                  </T>
                </T>
              }
            />
          </>
        )}
        <Button label={create ? "Create account" : "Sign in"} iconRight="arrow-forward" onPress={submit} loading={busy} height={56} style={{ marginTop: 6 }} />
        <T size={12} color={C.muted} style={{ textAlign: "center" }}>
          Not affiliated with JPS or NWC.
        </T>
      </ScrollView>

      <Sheet visible={termsOpen} onClose={() => setTermsOpen(false)} title="Terms">
        {TERMS.map((t, i) => (
          <T key={i} size={14} color={C.ink} style={{ lineHeight: 21, marginBottom: 10 }}>
            {i + 1}. {t}
          </T>
        ))}
        <Button
          label="Accept"
          onPress={() => {
            setTerms(true);
            setTermsOpen(false);
          }}
          style={{ marginTop: 6 }}
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function Check({ checked, onToggle, label }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: C.brownMid, backgroundColor: checked ? C.brownMid : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {checked && <Ionicons name="checkmark" size={15} color={C.cream} />}
      </View>
      {typeof label === "string" ? (
        <T size={14} style={{ flex: 1, lineHeight: 20 }}>
          {label}
        </T>
      ) : (
        <View style={{ flex: 1 }}>{label}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, paddingLeft: 6, paddingRight: 16, borderRadius: 28 },
  pillIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 16, right: 16, padding: 14, borderRadius: 32, gap: 8 },
  panel: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  switch: { flexDirection: "row", backgroundColor: C.sand, borderRadius: 14, padding: 4 },
  switchBtn: { flex: 1, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
