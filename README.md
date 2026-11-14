# GridGuardJA

## Download for Android

**[⬇ Download GridGuardJA.apk](https://github.com/ajayhamilton13-wq/GridGuardJA/releases/latest/download/GridGuardJA.apk)**

### How to install
1. Open the link above on your Android phone and download the APK.
2. Open the downloaded file.
3. If Android asks, allow installing apps from this source ("Install unknown apps").
4. Tap **Install**.

All versions: [Releases](https://github.com/ajayhamilton13-wq/GridGuardJA/releases)

---

## About the app

Community app for reporting and tracking power and water outages across Jamaica, in a warm brown-and-cream "dusk" design.

## The four tabs

- **Now** – power and water status for your area (your location, or a parish you pick), when it started, a Report button, side-scrolling nearby outages, and outage counts per parish.
- **Map** – outages and JPS/NWC stations. Search a parish or community, filter All / Power / Water / Stations, jump to your location, tap an outage for a card with **Me too** and **It's back**, press and hold (right-click on web) to report at that spot.
- **Community** – Chat (works offline: messages queue and send later), Resources (what neighbours are sharing), SMS alert (opens your messages app pre-filled).
- **You** – your initials, your stats (reports, things shared, outages you confirmed), what you share, personal info, emergency notes, sign out.

**Report an outage** opens from Now, Map or the outage cards. Pick No power / Flickering / No water / Low pressure, since when, and where (your location, the map spot, or a typed address), with an optional photo. If someone already reported the same kind of outage within 400 m, your report counts as a **Me too** on theirs instead of creating a duplicate.

## Setup

1. Copy these files into your Expo project, replacing the old `App.js` and `src/` folder.
2. Install the packages:

   ```
   npx expo install react-native-maps expo-location expo-sms expo-image-picker expo-blur expo-font react-native-svg @expo-google-fonts/plus-jakarta-sans @react-native-async-storage/async-storage @expo/vector-icons @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context firebase @supabase/supabase-js
   ```

   `react-native-tab-view` and `react-native-pager-view` are no longer used; you can uninstall them.

3. Copy `.env.example` to `.env` and fill in your Firebase and Supabase keys. Make sure `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` is set — report photos use Firebase Storage.
4. In the Firebase console, turn on **Storage** for your project (Build › Storage), then deploy the rules:

   ```
   firebase deploy --only firestore:rules,storage
   ```

5. For the camera, add the permission text to `app.json` under `expo.plugins`:

   ```json
   ["expo-image-picker", { "cameraPermission": "GridGuard JA uses the camera to add photos to outage reports." }]
   ```

6. `npx expo start`

## Project layout

```
App.js                       Fonts, sign-in gate
src/context/AppData.js       Shared live data (outages, resources, chat, location, area) and open sheets
src/navigation/              Tabs and the custom brown tab bar
src/screens/                 Welcome, Now, Map, ReportModal, You, community/*
src/components/              Scene (drawn dusk), ui (buttons, sheet, chips, frosted), OutageSheet, PlaceSheet, Share, WebMap
src/hooks/                   useOutageReports (Me too, It's back), useResources, useChat, useDeviceLocation, …
src/utils/geo.js             Parish centres, distances
firestore.rules, storage.rules
```

## Notes

- Parish counts use the parish saved with each report. Older reports without one are matched to the nearest parish centre, which is approximate near borders.
- Outage photos are visible to signed-in users only.
- Station data and the Supabase chat are unchanged from the previous version.
