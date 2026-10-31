import type { NextRequest } from "next/server";
import { adminFailure, requireAdminRequest } from "@/lib/admin/guard";
import { personalOk } from "@/lib/api-personal";
import { createQuotation } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * POST /api/admin/projects/{id}/quotations
 * Admin only (signed admin session; same-origin). Starts the next quotation version as a draft; a
 * revision starts as a copy of the latest version (lines, notes, payment terms, validity). No body.
 * 201 { kind: "quotation", data: { id, version, status: "draft" } }. Errors: 401 unauthenticated,
 * 403 forbidden, 404 not_found, 503, 500.
 * Example: POST /api/admin/projects/3f0c…/quotations → 201 { "kind": "quotation", "data": { "version": 2, "status": "draft" } }
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const { id } = await ctx.params;
    const created = await createQuotation(id);
    return personalOk({
      status: 201,
      kind: "quotation",
      label: `Quotation version ${created.version} started as a draft.`,
      data: { ...created, status: "draft" as const },
      links: { self: `/api/admin/projects/${id}/quotations/${created.id}`, html: `/admin/projects/${id}` },
    });
  } catch (err) {
    return adminFailure(err, "Starting a quotation");
  }
}
