import { appLinks } from "@/config/app-links";

// The two association files that let paintsaathi.in links open in the phone app (see
// src/config/app-links.ts), and the Android intent filter the app declares for them. The files need
// the owner's store credentials, read from the environment: APPLE_TEAM_ID (the 10-character Apple
// Developer Team ID) and ANDROID_CERT_SHA256 (the app signing certificate's SHA-256 fingerprint from
// Google Play Console, several separated by commas). Without valid ones nothing is claimed: the routes
// answer 404 rather than publish a file that names the wrong app.

const TEAM_ID = /^[A-Z0-9]{10}$/;
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** The Apple Team ID, when the environment holds a valid one. */
export function appleTeamId(env: Record<string, string | undefined> = process.env): string | undefined {
  const id = env.APPLE_TEAM_ID?.trim().toUpperCase();
  return id && TEAM_ID.test(id) ? id : undefined;
}

/** The Android signing certificates' SHA-256 fingerprints (upper-case, colon-separated); malformed ones are dropped. */
export function androidFingerprints(env: Record<string, string | undefined> = process.env): string[] {
  return (env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => FINGERPRINT.test(f));
}

/** /.well-known/apple-app-site-association: the app (Team ID + bundle) and the paths it opens. */
export function appleAppSiteAssociation(teamId: string) {
  return {
    applinks: {
      details: [{ appIDs: [`${teamId}.${appLinks.bundleId}`], components: appLinks.paths.map((path) => ({ "/": path })) }],
    },
  };
}

/** /.well-known/assetlinks.json: lets the Android app open every link on this domain it asks for. */
export function assetLinks(fingerprints: string[]) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: appLinks.bundleId, sha256_cert_fingerprints: fingerprints },
    },
  ];
}

type IntentData = { scheme: "https"; host: string; path?: string; pathPrefix?: string };

/** The Android intent filter mobile/app.json declares: https links to the claimed paths, verified against assetlinks.json. */
export function androidIntentFilter() {
  const data: IntentData[] = appLinks.paths.map((path) =>
    path.endsWith("/*") ? { scheme: "https", host: appLinks.host, pathPrefix: path.slice(0, -1) } : { scheme: "https", host: appLinks.host, path },
  );
  return { action: "VIEW", autoVerify: true, data, category: ["BROWSABLE", "DEFAULT"] };
}

/** The iOS associated domain mobile/app.json declares. */
export const associatedDomain = `applinks:${appLinks.host}`;
