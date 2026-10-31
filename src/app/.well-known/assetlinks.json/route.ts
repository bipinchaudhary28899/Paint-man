import { androidFingerprints, assetLinks } from "@/lib/app-links";

// GET /.well-known/assetlinks.json
// Android App Links: verifies that the Paint Saathi app (signed with these certificates) may open
// paintsaathi.in links (see src/config/app-links.ts). Google reads this exact shape from this exact
// path, so it is not the /api/v1 envelope. Served once ANDROID_CERT_SHA256 holds a valid fingerprint;
// until then 404, so no app is claimed.
// Example: [{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"in.paintsaathi.app","sha256_cert_fingerprints":["14:6D:…:5E"]}}]
export function GET() {
  const fingerprints = androidFingerprints();
  if (fingerprints.length === 0) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(assetLinks(fingerprints), { headers: { "Cache-Control": "public, max-age=3600" } });
}
