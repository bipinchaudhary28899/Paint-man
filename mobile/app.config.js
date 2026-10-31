// The app's config is app.json; this adds what is not committed, and one Android build rule.
//
// On Android react-native-maps draws Google Maps, which needs an API key (without one the app closes
// when a map opens). The key comes from GOOGLE_MAPS_ANDROID_API_KEY: mobile/.env.local on this Mac
// (gitignored, read by the Expo CLI) or the build service's secrets. In Google Cloud, restrict it to
// Maps SDK for Android, the package in.paintsaathi.app and the signing certificate's SHA-1.
//
// Release builds shrink the Java code (R8), which removed the constructor of WorkManager's Room
// database: the release app closed at launch ("Failed to create an instance of ... WorkDatabase").
// The keep rule below goes into the generated android/app/proguard-rules.pro on every prebuild.
const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const ROOM_KEEP_RULE = `# Room, used by WorkManager: keep the generated database classes and their constructors (app.config.js).
-keep class * extends androidx.room.RoomDatabase { <init>(...); }`;

const withRoomKeepRule = (config) =>
  withDangerousMod(config, [
    "android",
    async (mod) => {
      const file = path.join(mod.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
      const rules = fs.readFileSync(file, "utf8");
      if (!rules.includes("androidx.room.RoomDatabase")) fs.writeFileSync(file, `${rules.trimEnd()}\n\n${ROOM_KEEP_RULE}\n`);
      return mod;
    },
  ]);

module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const withKey = key ? { ...config, android: { ...config.android, config: { ...config.android?.config, googleMaps: { apiKey: key } } } } : config;
  return withRoomKeepRule(withKey);
};
