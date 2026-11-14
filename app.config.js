// App settings. The Google Maps key comes from the environment so it never sits in the repo.
module.exports = {
  expo: {
    name: "GridGuard JA",
    slug: "gridguard-ja",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    android: {
      package: "com.dornel.gridguardja",
      config: {
        googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY || "" },
      },
    },
    plugins: [
      "expo-font",
      [
        "expo-location",
        { locationWhenInUsePermission: "GridGuard JA uses your location to show outages near you and place your reports on the map." },
      ],
      [
        "expo-image-picker",
        { cameraPermission: "GridGuard JA uses the camera to add photos to outage reports." },
      ],
    ],
  },
};
