import { createClientFromRequest } from "npm:@base44/sdk";

const REMINDER_WINDOW_MS = 30 * 60 * 1000; // PRD §9.3: no more than one reminder per (revision, vendor) within 30 minutes.

/**
 * Scheduled sweep (PRD §9.3, unacknowledgedReminder). Contacts only registered,
 * accepted vendors with a pending acknowledgement on the event's CURRENT published
 * revision. No end-user request context — this runs on a timer, so it authorises
 * itself the same way prepareNotificationBatch does: by re-deriving eligibility
 * from the data itself rather than trusting a caller identity.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const svc = base44.asServiceRole;

  const events = (await svc.entities.Event.filter({})) as Array<{
    id: string;
    name: string;
    currentPublishedRevisionId?: string | null;
  }>;

  let remindersSent = 0;
  let remindersSkippedRecentlySent = 0;
  let remindersFailed = 0;

  for (const event of events) {
    if (!event.currentPublishedRevisionId) continue;

    const revision = await svc.entities.Revision.get(event.currentPublishedRevisionId).catch(() => null);
    if (!revision || revision.status !== "PUBLISHED") continue;

    const affectedParticipantIds: string[] = JSON.parse((revision.affectedParticipantIdsJson as string) || "[]");
    if (affectedParticipantIds.length === 0) continue;

    const acks = await svc.entities.Acknowledgement.filter({ eventId: event.id, revisionId: revision.id });
    const acknowledged = new Set(acks.map((a) => a.vendorParticipantId));
    const pendingIds = affectedParticipantIds.filter((id) => !acknowledged.has(id));
    if (pendingIds.length === 0) continue;

    for (const vendorParticipantId of pendingIds) {
      const participant = await svc.entities.VendorParticipant.get(vendorParticipantId).catch(() => null);
      if (!participant || participant.status !== "accepted" || !participant.userId) continue; // not an eligible registered channel

      const recentReminders = (await svc.entities.NotificationJob.filter({
        revisionId: revision.id,
        vendorParticipantId,
        channel: "email_reminder",
        status: "sent",
      })) as Array<{ sentAt?: string }>;
      const alreadyRemindedRecently = recentReminders.some(
        (job) => job.sentAt && Date.now() - new Date(job.sentAt).getTime() < REMINDER_WINDOW_MS,
      );
      if (alreadyRemindedRecently) {
        remindersSkippedRecentlySent++;
        continue;
      }

      try {
        await svc.integrations.Core.SendEmail({
          to: participant.email as string,
          subject: `[CueRelay] Reminder — please confirm v${revision.number} for ${event.name}`,
          body: `Hi ${participant.displayName}, you haven't confirmed you have the latest schedule for ${event.name} (v${revision.number}) yet. Sign in to CueRelay to review and acknowledge it.`,
          from_name: "CueRelay",
        });
        await svc.entities.NotificationJob.create({
          revisionId: revision.id,
          vendorParticipantId,
          channel: "email_reminder",
          idempotencyKey: `${revision.id}:${vendorParticipantId}:email_reminder:${Date.now()}`,
          status: "sent",
          attempts: 1,
          sentAt: new Date().toISOString(),
        });
        remindersSent++;
      } catch (err) {
        await svc.entities.NotificationJob.create({
          revisionId: revision.id,
          vendorParticipantId,
          channel: "email_reminder",
          idempotencyKey: `${revision.id}:${vendorParticipantId}:email_reminder:${Date.now()}`,
          status: "failed",
          attempts: 1,
          lastError: err instanceof Error ? err.message : "Email provider rejected the request.",
        });
        remindersFailed++;
      }
    }
  }

  return Response.json({ ok: true, remindersSent, remindersSkippedRecentlySent, remindersFailed });
}
