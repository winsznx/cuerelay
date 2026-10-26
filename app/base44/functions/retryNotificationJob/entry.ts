import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";

interface RetryNotificationJobBody {
  jobId?: string;
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to retry a notification.");

  const { jobId } = (await req.json().catch(() => ({}))) as RetryNotificationJobBody;
  if (!jobId) return apiError("VALIDATION_ERROR", "jobId is required.");

  const svc = base44.asServiceRole;
  const job = await svc.entities.NotificationJob.get(jobId).catch(() => null);
  if (!job) return apiError("NOT_FOUND", "Notification job not found.");

  const revision = await svc.entities.Revision.get(job.revisionId as string);
  const event = await svc.entities.Event.get(revision.eventId as string);
  if (event.ownerUserId !== user.id) return apiError("FORBIDDEN", "You do not own this event.");

  // FR-040 / T40: retrying an already-successful job is never a blind second send.
  if (job.status === "sent") return apiOk({ job, alreadySent: true });

  const participant = await svc.entities.VendorParticipant.get(job.vendorParticipantId as string).catch(() => null);
  if (!participant || participant.status !== "accepted" || !participant.userId) {
    const updated = await svc.entities.NotificationJob.update(jobId, {
      status: "failed",
      attempts: ((job.attempts as number) ?? 0) + 1,
      lastError: "Vendor has not accepted their invitation yet; no eligible email channel.",
    });
    return apiOk({ job: updated });
  }

  try {
    await svc.integrations.Core.SendEmail({
      to: participant.email as string,
      subject: `[CueRelay] Schedule updated — ${event.name} · v${revision.number}`,
      body: `Hi ${participant.displayName}, your call sheet has changed. Sign in to CueRelay to view your updated schedule and acknowledge it.`,
      from_name: "CueRelay",
    });
    const updated = await svc.entities.NotificationJob.update(jobId, {
      status: "sent",
      attempts: ((job.attempts as number) ?? 0) + 1,
      sentAt: new Date().toISOString(),
    });
    return apiOk({ job: updated });
  } catch (err) {
    const updated = await svc.entities.NotificationJob.update(jobId, {
      status: "failed",
      attempts: ((job.attempts as number) ?? 0) + 1,
      lastError: err instanceof Error ? err.message : "Email provider rejected the request.",
    });
    return apiOk({ job: updated });
  }
}
