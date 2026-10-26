import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import { requireOwnedEvent } from "../../shared/requireOwnedEvent.ts";
import { loadPublishedSnapshot } from "../../shared/loadPublishedSnapshot.ts";

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to view this event.");

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId") ?? (await req.json().catch(() => ({})))?.eventId;
  const owned = await requireOwnedEvent(base44, user.id, eventId ?? "");
  if ("error" in owned) return owned.error;
  const event = owned.event as { id: string; currentPublishedRevisionId?: string | null };

  const svc = base44.asServiceRole;
  // The displayed rundown must be the same baseline previewChange/publishRevision will actually use:
  // the published revision's snapshot once one exists, not the live (possibly stale) Cue rows.
  const [snapshot, vendors, revisions, assignments] = await Promise.all([
    loadPublishedSnapshot(base44, event.id, event.currentPublishedRevisionId ?? null),
    svc.entities.VendorParticipant.filter({ eventId: event.id }),
    svc.entities.Revision.filter({ eventId: event.id }, "-number"),
    svc.entities.CueAssignment.filter({ eventId: event.id }),
  ]);
  const { cues, dependencies } = snapshot;

  const cueIdsByVendorId: Record<string, string[]> = {};
  for (const a of assignments) {
    const vendorId = a.vendorParticipantId as string;
    (cueIdsByVendorId[vendorId] ??= []).push(a.cueId as string);
  }

  const currentRevision = event.currentPublishedRevisionId
    ? revisions.find((r) => r.id === event.currentPublishedRevisionId) ?? null
    : null;

  let pendingAcknowledgements = 0;
  let notificationFailures = 0;
  if (currentRevision) {
    const [acks, jobs] = await Promise.all([
      svc.entities.Acknowledgement.filter({ eventId: event.id, revisionId: currentRevision.id }),
      svc.entities.NotificationJob.filter({ revisionId: currentRevision.id }),
    ]);
    const acknowledgedParticipantIds = new Set(acks.map((a) => a.vendorParticipantId));
    const affectedParticipantIds: string[] = JSON.parse((currentRevision.affectedParticipantIdsJson as string) || "[]");
    pendingAcknowledgements = affectedParticipantIds.filter((id) => !acknowledgedParticipantIds.has(id)).length;
    notificationFailures = jobs.filter((j) => j.status === "failed").length;
  }

  return apiOk({
    event,
    cues,
    dependencies,
    vendors,
    cueIdsByVendorId,
    revisions,
    currentRevision,
    attention: { pendingAcknowledgements, notificationFailures },
  });
}
