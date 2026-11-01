// The app's config is app.json; this adds what is not committed, and two Android build rules.
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
const { withDangerousMod, withMainApplication } = require("expo/config-plugins");

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

// React Native's Android HTTP client (OkHttp) has no timeouts at all and keeps idle connections for
// five minutes. A mobile network quietly drops an idle connection long before that, so the next
// request (sending a code after typing the number, saving an address after typing it) could hang on
// the dead connection for a long time. The app's client closes idle connections after 30 seconds,
// pings open ones every 15 seconds (a dropped one is noticed and replaced), and gives up on a stalled
// request instead of waiting forever (src/lib/api.ts then tries a GET or PATCH once more).
const OKHTTP_MARK = "// Paint Saathi HTTP client (app.config.js)";
const OKHTTP_IMPORTS = ["import com.facebook.react.modules.network.OkHttpClientProvider", "import java.util.concurrent.TimeUnit", "import okhttp3.ConnectionPool"];
const OKHTTP_SETUP = `    ${OKHTTP_MARK}
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder(applicationContext)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .pingInterval(15, TimeUnit.SECONDS)
        .connectionPool(ConnectionPool(5, 30, TimeUnit.SECONDS))
        .build()
    }`;

const withHttpClient = (config) =>
  withMainApplication(config, (mod) => {
    let src = mod.modResults.contents;
    if (src.includes(OKHTTP_MARK)) return mod;
    if (mod.modResults.language !== "kt" || !/super\.onCreate\(\)\n/.test(src)) throw new Error("app.config.js: MainApplication.kt is not as expected; set up the HTTP client by hand");
    const missing = OKHTTP_IMPORTS.filter((line) => !src.includes(line));
    src = src.replace(/^(package .+\n)/m, `$1\n${missing.join("\n")}\n`);
    src = src.replace(/super\.onCreate\(\)\n/, `super.onCreate()\n${OKHTTP_SETUP}\n`);
    mod.modResults.contents = src;
    return mod;
  });

// Push notifications on Android go through Firebase: Expo push tokens need the Firebase project's
// google-services.json in the build. Its path comes from GOOGLE_SERVICES_JSON (mobile/.env.local or
// the build service's secrets; the file itself is not committed). iOS needs nothing here: the
// expo-notifications plugin in app.json adds the push entitlement, and Apple's key lives in the
// app's Expo project.

module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON?.trim();
  const android = {
    ...config.android,
    ...(key && { config: { ...config.android?.config, googleMaps: { apiKey: key } } }),
    ...(googleServicesFile && { googleServicesFile }),
  };
  return withHttpClient(withRoomKeepRule({ ...config, android }));
};
