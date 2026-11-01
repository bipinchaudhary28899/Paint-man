import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { inspections, projectEvents, projects } from "@/lib/db/schema";
import { STAGE_LABELS, stageExplanation } from "@/lib/projects/stages";
import { sendPush, type PushMessage } from "./send";

// The customer's push notification when the team moves their project on (a booking confirmed, an
// inspection scheduled or done, a quotation shared or approved, work scheduled, any stage set by
// hand): the newest event the request made, worded as the project page words it (the stage's name,
// and the team's note or the stage's explanation from stages.ts). A tap opens the project.

/** The message for the newest event on the project since `since`, and whose phones get it; null when there is none to send. */
export async function projectUpdateMessage(projectId: string, since: Date): Promise<(PushMessage & { userId: string }) | null> {
  const db = await getDb();
  const [p] = await db.select({ userId: projects.userId, workStartsOn: projects.workStartsOn }).from(projects).where(eq(projects.id, projectId));
  if (!p?.userId) return null;
  const [event] = await db
    .select({ stage: projectEvents.stage, note: projectEvents.note })
    .from(projectEvents)
    .where(and(eq(projectEvents.projectId, projectId), gte(projectEvents.createdAt, since)))
    .orderBy(desc(projectEvents.createdAt))
    .limit(1);
  if (!event) return null;
  const [inspection] = await db.select({ scheduledAt: inspections.scheduledAt }).from(inspections).where(eq(inspections.projectId, projectId)).limit(1);
  return {
    userId: p.userId,
    title: STAGE_LABELS[event.stage],
    body: event.note ?? stageExplanation(event.stage, { inspectionAt: inspection?.scheduledAt, workStartsOn: p.workStartsOn }),
    url: `/account/projects/${projectId}`,
  };
}

/** Sends the project's newest update (since `since`) to its customer; a failure is logged by type only. */
export async function pushProjectUpdate(projectId: string, since: Date, fetchImpl?: typeof fetch): Promise<void> {
  try {
    const message = await projectUpdateMessage(projectId, since);
    if (message) await sendPush(message.userId, message, fetchImpl);
  } catch (err) {
    console.error("Project update push failed:", err instanceof Error ? err.name : "unknown error");
  }
}

/**
 * After the response has gone, tells the customer about the update this request made (so the team's
 * action never waits on the push service). Outside a request (tests, scripts) it runs at once.
 */
export function notifyProjectUpdate(projectId: string, since: Date): void {
  const run = () => pushProjectUpdate(projectId, since);
  try {
    after(run);
  } catch {
    void run();
  }
}
