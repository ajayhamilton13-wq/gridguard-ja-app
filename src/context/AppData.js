import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNavigationContainerRef } from "@react-navigation/native";
import { useOutageReports } from "../hooks/useOutageReports";
import { useResources } from "../hooks/useResources";
import { useCurrentUsername } from "../hooks/useCurrentUsername";
import { useDeviceLocation } from "../hooks/useDeviceLocation";
import { useChat } from "../hooks/useChat";

export const navigationRef = createNavigationContainerRef();

export function goToMap(params) {
  if (navigationRef.isReady()) navigationRef.navigate("Map", { ...params, at: Date.now() });
}

const AppDataContext = createContext(null);
export const useAppData = () => useContext(AppDataContext);

const FOCUS_KEY = "focus_area_v1";

// Everything the tabs share: live data, the user's area, and the open sheets
export function AppDataProvider({ children }) {
  const outages = useOutageReports();
  const [username, setUsername] = useCurrentUsername();
  const resources = useResources(username);
  const location = useDeviceLocation();
  const chat = useChat(username);

  // { kind: "gps" } or { kind: "parish", name: "St. Catherine" }
  const [focus, setFocusState] = useState({ kind: "gps" });
  useEffect(() => {
    AsyncStorage.getItem(FOCUS_KEY)
      .then((v) => v && setFocusState(JSON.parse(v)))
      .catch(() => {});
  }, []);
  const setFocus = (f) => {
    setFocusState(f);
    AsyncStorage.setItem(FOCUS_KEY, JSON.stringify(f)).catch(() => {});
  };

  const [reportOpts, setReportOpts] = useState(null); // null = closed
  const [openOutageId, setOpenOutageId] = useState(null);
  const [openPlace, setOpenPlace] = useState(null);

  const value = useMemo(
    () => ({
      outages,
      resources,
      username,
      setUsername,
      location,
      chat,
      focus,
      setFocus,
      reportOpts,
      openReport: (opts = {}) => setReportOpts(opts),
      closeReport: () => setReportOpts(null),
      openOutageId,
      openOutage: (id) => setOpenOutageId(id),
      closeOutage: () => setOpenOutageId(null),
      openPlace,
      setOpenPlace,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outages, resources, username, location, chat, focus, reportOpts, openOutageId, openPlace]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
