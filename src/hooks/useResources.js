import { useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "../lib/firebaseConfig";
import { toIso } from "../utils/time";

// Old builds kept resources only on the phone under this key
const LOCAL_KEY = "resources_v2";

function resourceFromDoc(docSnap) {
  const data = docSnap.data();
  return { ...data, id: docSnap.id, createdAt: toIso(data.createdAt) };
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Moves resources saved by an older build on this phone into Firestore, owned by the current user
async function migrateLocalResources(uid, ownerName) {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_KEY);
    const items = stored ? JSON.parse(stored) : [];
    if (!items.length) return;
    const batch = writeBatch(firebaseDb);
    items.forEach((r) => {
      const createdAt = toIso(r.createdAt) || toIso(r.id) || new Date().toISOString();
      batch.set(doc(firebaseDb, "resources", String(r.id)), {
        text: String(r.text || "").slice(0, 200),
        ownerId: uid,
        ownerName: ownerName || "",
        createdAt: new Date(createdAt),
      });
    });
    await batch.commit();
    await AsyncStorage.removeItem(LOCAL_KEY);
  } catch (error) {
    console.log("Resource migration error:", error?.message || error);
  }
}

// Community resources everyone signed in can see. Each person can only remove their own.
// Falls back to phone-only storage when Firebase is not configured.
export function useResources(ownerName) {
  const [resources, setResources] = useState([]);
  const uid = firebaseAuth?.currentUser?.uid || null;

  useEffect(() => {
    if (!firebaseDb) {
      AsyncStorage.getItem(LOCAL_KEY)
        .then((d) => setResources(d ? JSON.parse(d) : []))
        .catch(() => {});
      return undefined;
    }

    if (uid) migrateLocalResources(uid, ownerName);

    const q = query(collection(firebaseDb, "resources"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => setResources(snapshot.docs.map(resourceFromDoc)),
      (error) => console.log("Firestore resources listen error:", error.message)
    );
    // ownerName is only used for the one-time migration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const saveLocal = (next) => {
    setResources(next);
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next)).catch(() => {});
  };

  const fail = (error) =>
    Alert.alert(
      "Sync Error",
      error?.code === "permission-denied"
        ? "You can only remove resources you added."
        : error?.message || "Could not save to the server."
    );

  const addResource = (text) => {
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    const resource = {
      id: newId(),
      text: clean,
      ownerId: uid,
      ownerName: ownerName || "",
      createdAt: new Date().toISOString(),
    };
    if (firebaseDb) {
      const { id, ...data } = resource;
      setDoc(doc(firebaseDb, "resources", id), { ...data, createdAt: new Date(data.createdAt) }).catch(fail);
    } else {
      saveLocal([resource, ...resources]);
    }
  };

  const removeResource = (id) => {
    if (firebaseDb) deleteDoc(doc(firebaseDb, "resources", id)).catch(fail);
    else saveLocal(resources.filter((r) => r.id !== id));
  };

  const myResources = firebaseDb ? resources.filter((r) => r.ownerId === uid) : resources;

  const clearMyResources = () => {
    if (!firebaseDb) {
      saveLocal([]);
      return;
    }
    const batch = writeBatch(firebaseDb);
    myResources.forEach((r) => batch.delete(doc(firebaseDb, "resources", r.id)));
    batch.commit().catch(fail);
  };

  const isMine = (r) => !firebaseDb || r.ownerId === uid;

  return { resources, myResources, addResource, removeResource, clearMyResources, isMine };
}
