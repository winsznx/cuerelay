import { createClientFromRequest } from "npm:@base44/sdk";

interface PrepareNotificationBatchBody {
  batchId?: string;
}

/**
 * Invoked by the dispatchPublishedRevision Workflow when a NotificationBatch is
 * CREATED (never on status updates, so the workflow cannot re-trigger itself —
 * PRD §9.1, FR-056). There is no end-user request context here, only the system
 * trigger, so this function authorises itself by re-deriving everything from the
 * batch's own referenced revision rather than trusting any caller identity.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const svc = base44.asServiceRole;
  const { batchId } = (await req.json().catch(() => ({}))) as PrepareNotificationBatchBody;
  if (!batchId) return Response.json({ ok: false, error: "batchId is required" }, { status: 400 });

  // Claim the batch atomically so a duplicate trigger (or a retried run) cannot process it twice.
  const claim = await svc.entities.NotificationBatch.updateMany({ id: batchId, status: "queued" }, { $set: { status: "processing" } });
  if (claim.updated !== 1) {
    return Response.json({ ok: true, skipped: "already claimed or not queued" });
  }

  const batch = await svc.entities.NotificationBatch.get(batchId);
  const revision = await svc.entities.Revision.get(batch.revisionId as string);
  const event = await svc.entities.Event.get(batch.eventId as string);

  // Defensive re-check: only dispatch for a batch whose revision is genuinely the event's current published one.
  if (revision.status !== "PUBLISHED" || event.currentPublishedRevisionId !== batch.revisionId) {
    await svc.entities.NotificationBatch.update(batchId, { status: "failed", finishedAt: new Date().toISOString() });
    return Response.json({ ok: true, skipped: "revision is not the current published revision" });
  }

  const affectedParticipantIds: string[] = JSON.parse((revision.affectedParticipantIdsJson as string) || "[]");
  const outcomes = await Promise.all(
    affectedParticipantIds.map((vendorParticipantId) => dispatchToParticipant(svc, batch, revision, event, vendorParticipantId)),
  );

  const anySent = outcomes.some((o) => o === "sent");
  const anyFailed = outcomes.some((o) => o === "failed");
  const finalStatus = !anyFailed ? "sent" : anySent ? "partial" : "failed";

  await svc.entities.NotificationBatch.update(batchId, { status: finalStatus, finishedAt: new Date().toISOString() });
  await svc.entities.EventAudit.create({
    eventId: event.id,
    actorUserId: "system:dispatchPublishedRevision",
    action: "notification_batch_dispatched",
    targetId: batchId,
    timestamp: new Date().toISOString(),
    summary: `Notification batch for v${revision.number} finished: ${finalStatus}`,
    metadataJson: JSON.stringify({ outcomes }),
  });

  return Response.json({ ok: true, status: finalStatus });
}

type Base44ServiceRole = ReturnType<typeof createClientFromRequest>["asServiceRole"];

async function dispatchToParticipant(
  svc: Base44ServiceRole,
  batch: Record<string, unknown>,
  revision: Record<string, unknown>,
  event: Record<string, unknown>,
  vendorParticipantId: string,
): Promise<"sent" | "failed"> {
  const idempotencyKey = `${revision.id}:${vendorParticipantId}:email`;
  const existingJob = (await svc.entities.NotificationJob.filter({ idempotencyKey }, undefined, 1))[0];
  if (existingJob && existingJob.status === "sent") return "sent"; // already delivered; never resend a successful job (FR-054)

  const job =
    existingJob ??
    (await svc.entities.NotificationJob.create({
      batchId: batch.id,
      revisionId: revision.id,
      vendorParticipantId,
      channel: "email",
      idempotencyKey,
      status: "pending",
      attempts: 0,
    }));

  const participant = await svc.entities.VendorParticipant.get(vendorParticipantId).catch(() => null);
  if (!participant || participant.status !== "accepted" || !participant.userId) {
    await svc.entities.NotificationJob.update(job.id as string, {
      status: "failed",
      attempts: ((job.attempts as number) ?? 0) + 1,
      lastError: "Vendor has not accepted their invitation yet; no eligible email channel.",
    });
    return "failed";
  }

  try {
    await svc.integrations.Core.SendEmail({
      to: participant.email as string,
      subject: `[CueRelay] Schedule updated — ${event.name} · v${revision.number}`,
      body: buildEmailBody(event, revision, participant),
      from_name: "CueRelay",
    });
    await svc.entities.NotificationJob.update(job.id as string, {
      status: "sent",
      attempts: ((job.attempts as number) ?? 0) + 1,
      sentAt: new Date().toISOString(),
    });
    return "sent";
  } catch (err) {
    await svc.entities.NotificationJob.update(job.id as string, {
      status: "failed",
      attempts: ((job.attempts as number) ?? 0) + 1,
      lastError: err instanceof Error ? err.message : "Email provider rejected the request.",
    });
    return "failed";
  }
}

function buildEmailBody(event: Record<string, unknown>, revision: Record<string, unknown>, participant: Record<string, unknown>): string {
  return [
    `${event.name} — schedule updated to v${revision.number}`,
    `Date: ${event.eventDateLocal} (${event.timezone})`,
    revision.changeReason ? `Reason: ${revision.changeReason}` : null,
    "",
    `Hi ${participant.displayName}, your call sheet has changed. Sign in to CueRelay to view your updated schedule and acknowledge it.`,
  ]
    .filter(Boolean)
    .join("\n");
}
