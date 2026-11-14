import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "../lib/firebaseConfig";

const pickName = (p) => p?.username || p?.name || "";

// The name shown on chat messages and shared resources.
// Returns [username, setUsername] so the Account screen can update it after saving.
export function useCurrentUsername() {
  const [username, setUsername] = useState("Anonymous");

  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    let cancelled = false;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem("user_profile");
        const profile = cached ? JSON.parse(cached) : null;
        if (!cancelled && profile?.uid === uid && pickName(profile)) setUsername(pickName(profile));
      } catch {}

      if (!uid || !firebaseDb) return;
      try {
        const snap = await getDoc(doc(firebaseDb, "users", uid));
        if (!cancelled && snap.exists() && pickName(snap.data())) setUsername(pickName(snap.data()));
      } catch (error) {
        console.log("Username load error:", error?.message || error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return [username, setUsername];
}
