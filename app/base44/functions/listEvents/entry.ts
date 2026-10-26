import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to view your events.");

  const svc = base44.asServiceRole;
  const events = await svc.entities.Event.filter({ ownerUserId: user.id }, "-created_date");

  const attentionByEventId = {};
  await Promise.all(
    events.map(async (event) => {
      if (!event.currentPublishedRevisionId) {
        attentionByEventId[event.id] = { pendingAcknowledgements: 0, notificationFailures: 0 };
        return;
      }
      const revision = await svc.entities.Revision.get(event.currentPublishedRevisionId as string).catch(() => null);
      if (!revision) {
        attentionByEventId[event.id] = { pendingAcknowledgements: 0, notificationFailures: 0 };
        return;
      }
      const [acks, jobs] = await Promise.all([
        svc.entities.Acknowledgement.filter({ eventId: event.id, revisionId: revision.id }),
        svc.entities.NotificationJob.filter({ revisionId: revision.id }),
      ]);
      const acknowledgedParticipantIds = new Set(acks.map((a) => a.vendorParticipantId));
      const affectedParticipantIds: string[] = JSON.parse((revision.affectedParticipantIdsJson as string) || "[]");
      attentionByEventId[event.id] = {
        pendingAcknowledgements: affectedParticipantIds.filter((id) => !acknowledgedParticipantIds.has(id)).length,
        notificationFailures: jobs.filter((j) => j.status === "failed").length,
      };
    }),
  );

  return apiOk({ events, attentionByEventId });
}
