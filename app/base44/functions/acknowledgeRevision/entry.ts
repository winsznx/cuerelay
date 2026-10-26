import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";

interface AcknowledgeRevisionBody {
  eventId?: string;
  revisionId?: string;
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to acknowledge this schedule.");

  const body = (await req.json().catch(() => ({}))) as AcknowledgeRevisionBody;
  if (!body.eventId || !body.revisionId) return apiError("VALIDATION_ERROR", "eventId and revisionId are required.");

  const svc = base44.asServiceRole;
  const participant = (await svc.entities.VendorParticipant.filter({ eventId: body.eventId, userId: user.id, status: "accepted" }, undefined, 1))[0];
  if (!participant) return apiError("FORBIDDEN", "You are not an accepted participant on this event.");

  const event = await svc.entities.Event.get(body.eventId);
  // FR-048 / T28: a vendor viewing a superseded version cannot accidentally acknowledge it as current.
  if (event.currentPublishedRevisionId !== body.revisionId) {
    return apiError("STALE_REVISION", "A newer schedule is available. Refresh before acknowledging.", {
      latestRevisionId: event.currentPublishedRevisionId,
    });
  }

  // FR-045 / T27: idempotent — a repeated click cannot create more than one receipt.
  const existing = (await svc.entities.Acknowledgement.filter(
    { eventId: body.eventId, revisionId: body.revisionId, vendorParticipantId: participant.id },
    undefined,
    1,
  ))[0];
  if (existing) return apiOk({ acknowledgement: existing, duplicate: true });

  const acknowledgement = await svc.entities.Acknowledgement.create({
    eventId: body.eventId,
    revisionId: body.revisionId,
    vendorParticipantId: participant.id,
    acknowledgedAt: new Date().toISOString(),
  });

  return apiOk({ acknowledgement }, 201);
}
