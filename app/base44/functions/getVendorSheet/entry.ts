import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import type { Cue, PublishedSnapshot } from "../../shared/schedulingEngine/types.ts";

interface GetVendorSheetQuery {
  eventId?: string;
}

/**
 * Server-constructed, vendor-scoped view (PRD §13.3): the browser never receives
 * cues the vendor isn't authorised to see, because they're excluded here before
 * the response is built — not merely hidden in the UI.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to view your call sheet.");

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId") ?? ((await req.json().catch(() => ({}))) as GetVendorSheetQuery)?.eventId;
  if (!eventId) return apiError("VALIDATION_ERROR", "eventId is required.");

  const svc = base44.asServiceRole;
  const participant = (await svc.entities.VendorParticipant.filter({ eventId, userId: user.id, status: "accepted" }, undefined, 1))[0];
  if (!participant) {
    return apiError("FORBIDDEN", "You are not an accepted participant on this event.");
  }

  const event = await svc.entities.Event.get(eventId);
  if (!event.currentPublishedRevisionId) {
    return apiOk({ event: { name: event.name, eventDateLocal: event.eventDateLocal, timezone: event.timezone, venueName: event.venueName }, published: false });
  }

  const revision = await svc.entities.Revision.get(event.currentPublishedRevisionId as string);
  const snapshot = JSON.parse(revision.fullSnapshotJson as string) as PublishedSnapshot;

  const assignments = await svc.entities.CueAssignment.filter({ eventId, vendorParticipantId: participant.id });
  const assignedCueIds = new Set(assignments.map((a) => a.cueId as string));
  const visibleCues = (snapshot.cues as Cue[])
    .filter((cue) => assignedCueIds.has(cue.id) || cue.shareWithAllVendors)
    .sort((a, b) => a.startMinute - b.startMinute);

  const acknowledgement = (await svc.entities.Acknowledgement.filter({ eventId, revisionId: revision.id, vendorParticipantId: participant.id }, undefined, 1))[0];

  return apiOk({
    published: true,
    event: { name: event.name, eventDateLocal: event.eventDateLocal, timezone: event.timezone, venueName: event.venueName },
    revision: { id: revision.id, number: revision.number, publishedAt: revision.publishedAt, changeReason: revision.changeReason },
    cues: visibleCues,
    vendorParticipant: { id: participant.id, displayName: participant.displayName, roleLabel: participant.roleLabel },
    acknowledged: Boolean(acknowledgement),
    acknowledgedAt: acknowledgement?.acknowledgedAt ?? null,
  });
}
