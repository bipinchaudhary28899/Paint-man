import type { NextRequest } from "next/server";
import { adminFailure, readAdminInput, requireAdminRequest } from "@/lib/admin/guard";
import { personalOk } from "@/lib/api-personal";
import { stageChangeSchema } from "@/lib/projects/inputs";
import { setProjectStage } from "@/lib/projects/repo";
import { STAGE_LABELS } from "@/lib/projects/stages";

export const runtime = "nodejs";

/**
 * POST /api/admin/projects/{id}/stage
 * Admin only (signed admin session; same-origin). Sets the project's stage by hand (any stage: on,
 * back, on hold, cancelled) and appends a timeline event. `note` is shown to the customer on their
 * tracker; setting the current stage again with a note posts a progress update. `workStartsOn`
 * (YYYY-MM-DD) also records the crew's start date.
 * Body: { stage, note?, workStartsOn? }. 200 { kind: "project", data: { id, stage, stageLabel } }.
 * Errors: 400 invalid_request, 401 unauthenticated, 403 forbidden, 404 not_found, 413, 415, 503, 500.
 * Example: POST /api/admin/projects/3f0c…/stage { "stage": "call_confirmed", "note": "Visit fixed for Tuesday" }
 *   → 200 { "kind": "project", "data": { "stage": "call_confirmed", "stageLabel": "Visit being arranged" } }
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const input = await readAdminInput(req, stageChangeSchema);
    if (!input.ok) return input.response;
    const { id } = await ctx.params;
    const { stage, note, workStartsOn } = input.data;
    await setProjectStage(id, stage, { note, workStartsOn });
    return personalOk({
      kind: "project",
      label: `Project moved to "${STAGE_LABELS[stage]}".`,
      data: { id, stage, stageLabel: STAGE_LABELS[stage] },
      links: { self: `/api/admin/projects/${id}/stage`, html: `/admin/projects/${id}` },
    });
  } catch (err) {
    return adminFailure(err, "Setting a project's stage");
  }
}
