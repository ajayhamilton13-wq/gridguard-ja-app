import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "../lib/firebaseConfig";
import { toIso } from "../utils/time";
import { distanceKm, hasCoords, nearestParish } from "../utils/geo";

const OUTAGE_CACHE_KEY = "outage_reports_v2";

export const isResolvedStatus = (status) => status === "Restored" || status === "Resolved";
export const isActive = (r) => !isResolvedStatus(r.status);
export const reportCount = (r) => 1 + (r.confirmedBy?.length || 0);
export const reportStart = (r) => r.outageStartedAt || r.createdAt;
export const currentUid = () => firebaseAuth?.currentUser?.uid || null;
export const isMine = (r) => !!r?.reporterId && r.reporterId === currentUid();
export const hasConfirmed = (r) => !!currentUid() && (r?.confirmedBy || []).includes(currentUid());
// Reports made before reporterId existed have no owner, so anyone may manage them
export const canDelete = (r) => !r?.reporterId || isMine(r);

// An active report of the same kind within 400 m: a new report would be a duplicate
export function findDuplicate(reports, type, point) {
  if (!hasCoords(point)) return null;
  return (
    reports
      .filter((r) => r.type === type && isActive(r) && hasCoords(r))
      .map((r) => ({ r, d: distanceKm(point, r) }))
      .filter((x) => x.d <= 0.4)
      .sort((a, b) => a.d - b.d)[0]?.r || null
  );
}

function reportFromDoc(docSnap) {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: toIso(data.createdAt),
    outageStartedAt: toIso(data.outageStartedAt),
  };
}

function syncErrorMessage(error) {
  return error?.code === "permission-denied"
    ? "You can't change that report."
    : error?.message || "Could not save to the server.";
}

// One shared, live outage list. Each change writes only the report it touches,
// so a device with a stale list can never overwrite other people's reports.
export function useOutageReports() {
  const [reports, setReports] = useState([]);
  const [live, setLive] = useState(false);
  const gotLive = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(OUTAGE_CACHE_KEY)
      .then((d) => {
        if (d && !gotLive.current) setReports(JSON.parse(d).map((r) => ({ ...r, id: String(r.id) })));
      })
      .catch(() => {});

    if (!firebaseDb) return undefined;

    const q = query(collection(firebaseDb, "outageReports"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        gotLive.current = true;
        setLive(!snapshot.metadata.fromCache);
        const next = snapshot.docs.map(reportFromDoc);
        setReports(next);
        AsyncStorage.setItem(OUTAGE_CACHE_KEY, JSON.stringify(next)).catch(() => {});
      },
      (error) => {
        setLive(false);
        console.log("Firestore outage listen error:", error.message);
      }
    );
  }, []);

  const applyLocal = (updater) =>
    setReports((prev) => {
      const next = updater(prev);
      AsyncStorage.setItem(OUTAGE_CACHE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  // Firestore applies writes locally right away (the listener fires), so don't wait on the server
  const sync = (promise) => promise.catch((error) => Alert.alert("Sync Error", syncErrorMessage(error)));

  const addReport = (report) => {
    const now = new Date().toISOString();
    const newReport = {
      radius: 400,
      ...report,
      id: String(report.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      reporterId: currentUid(),
      createdAt: now,
      outageStartedAt: report.outageStartedAt || now,
      parish: report.parish || nearestParish(report) || null,
      confirmedBy: [],
    };
    if (firebaseDb) {
      const { id, ...data } = newReport;
      sync(
        setDoc(doc(firebaseDb, "outageReports", id), {
          ...data,
          createdAt: new Date(data.createdAt),
          outageStartedAt: new Date(data.outageStartedAt),
        })
      );
    } else {
      applyLocal((prev) => [newReport, ...prev]);
    }
    return newReport;
  };

  const updateReport = (id, changes) => {
    if (firebaseDb) sync(setDoc(doc(firebaseDb, "outageReports", String(id)), changes, { merge: true }));
    else applyLocal((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  };

  // "Me too": adds your uid to the report's confirmations
  const confirmReport = (id) => {
    const uid = currentUid();
    if (!uid) return;
    if (firebaseDb) sync(updateDoc(doc(firebaseDb, "outageReports", String(id)), { confirmedBy: arrayUnion(uid) }));
    else applyLocal((prev) => prev.map((r) => (r.id === id ? { ...r, confirmedBy: [...(r.confirmedBy || []), uid] } : r)));
  };

  // "It's back"
  const resolveReport = (r) =>
    updateReport(r.id, { status: r.type === "water" ? "Resolved" : "Restored", resolvedAt: new Date().toISOString() });

  const removeReport = (id) => {
    if (firebaseDb) sync(deleteDoc(doc(firebaseDb, "outageReports", String(id))));
    else applyLocal((prev) => prev.filter((r) => r.id !== id));
  };

  return { reports, live, addReport, updateReport, confirmReport, resolveReport, removeReport };
}
