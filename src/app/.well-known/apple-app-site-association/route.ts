import { appleAppSiteAssociation, appleTeamId } from "@/lib/app-links";

// GET /.well-known/apple-app-site-association
// iOS Universal Links: tells iOS which paintsaathi.in paths open in the Paint Saathi app (see
// src/config/app-links.ts). Apple reads this exact shape from this exact path, so it is not the
// /api/v1 envelope. Served once APPLE_TEAM_ID is set; until then 404, so no app is claimed.
// Example: {"applinks":{"details":[{"appIDs":["ABCDE12345.in.paintsaathi.app"],"components":[{"/":"/"},{"/":"/about"},…]}]}}
export function GET() {
  const teamId = appleTeamId();
  if (!teamId) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(appleAppSiteAssociation(teamId), { headers: { "Cache-Control": "public, max-age=3600" } });
}
