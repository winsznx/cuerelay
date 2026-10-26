import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import { requireOwnedEvent } from "../../shared/requireOwnedEvent.ts";
import { previewChange as runPreview } from "../../shared/schedulingEngine/engine.ts";
import { ScheduleValidationError, type CueEdit } from "../../shared/schedulingEngine/types.ts";
import { loadPublishedSnapshot } from "../../shared/loadPublishedSnapshot.ts";
import { affectedVendorParticipantIds } from "../../shared/affectedVendorParticipantIds.ts";

interface PublishRevisionBody {
  eventId?: string;
  baseRevisionId?: string | null;
  edits?: CueEdit[];
  idempotencyKey?: string;
  changeReason?: string;
  confirmed?: boolean;
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to publish a revision.");

  const body = (await req.json().catch(() => ({}))) as PublishRevisionBody;
  const owned = await requireOwnedEvent(base44, user.id, body.eventId ?? "");
  if ("error" in owned) return owned.error;
  const event = owned.event as {
    id: string;
    currentPublishedRevisionId?: string | null;
    versionCounter: number;
    hardStopMinute: number;
  };

  if (!body.confirmed) return apiError("VALIDATION_ERROR", "Publishing requires explicit confirmation.");
  if (!body.idempotencyKey) return apiError("VALIDATION_ERROR", "idempotencyKey is required.");
  if (!Array.isArray(body.edits) || body.edits.length === 0) {
    return apiError("VALIDATION_ERROR", "At least one cue edit is required.");
  }

  const svc = base44.asServiceRole;
  const eventId = event.id;
  const currentPublishedRevisionId = event.currentPublishedRevisionId ?? null;

  // FR-036 / T24: a repeated publish with the same idempotency key has no duplicate effect.
  const existing = (await svc.entities.Revision.filter({ eventId, idempotencyKey: body.idempotencyKey }, undefined, 1))[0];
  if (existing) {
    return apiOk({ revision: existing, duplicate: true });
  }

  // FR-031 / T23: a stale proposal — one whose base no longer matches the live published pointer — is rejected.
  if (body.baseRevisionId !== undefined && body.baseRevisionId !== currentPublishedRevisionId) {
    return apiError("STALE_REVISION", "The published schedule changed. Review the latest version and preview again.", {
      latestRevisionId: currentPublishedRevisionId,
    });
  }

  const snapshot = await loadPublishedSnapshot(base44, eventId, currentPublishedRevisionId);

  let result;
  try {
    result = runPreview(snapshot, body.edits);
  } catch (err) {
    if (err instanceof ScheduleValidationError) {
      const code = err.code === "DEPENDENCY_CYCLE" || err.code === "NOT_FOUND" ? err.code : "VALIDATION_ERROR";
      return apiError(code as "DEPENDENCY_CYCLE" | "NOT_FOUND" | "VALIDATION_ERROR", err.message, err.details);
    }
    throw err;
  }

  // The server recomputes the proposal itself and never trusts a client-supplied snapshot (PRD §8.3).
  if (!result.canPublish) {
    return apiError("UNRESOLVED_CONFLICT", "This proposal still has unresolved conflicts and cannot be published.", {
      conflicts: result.conflicts,
    });
  }

  const nextNumber = (event.versionCounter ?? 0) + 1;
  const proposedSnapshot = { cues: result.proposedCues, dependencies: snapshot.dependencies, hardStopMinute: snapshot.hardStopMinute };
  const affectedParticipantIds = await affectedVendorParticipantIds(base44, eventId, result.affectedCueIds);

  const revision = await svc.entities.Revision.create({
    eventId,
    number: nextNumber,
    // Omit baseRevisionId entirely for the first-ever publish; the string-typed field rejects an explicit null.
    ...(currentPublishedRevisionId ? { baseRevisionId: currentPublishedRevisionId } : {}),
    status: "PUBLISHED",
    fullSnapshotJson: JSON.stringify(proposedSnapshot),
    changedCueIdsJson: JSON.stringify(result.affectedCueIds),
    affectedParticipantIdsJson: JSON.stringify(affectedParticipantIds),
    conflictsJson: JSON.stringify([]),
    changeReason: body.changeReason ?? "",
    approvedByUserId: user.id,
    approvedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    idempotencyKey: body.idempotencyKey,
  });

  // Atomic compare-and-set: the pointer only moves if it still matches what this proposal was computed against.
  // A concurrent publish that already moved it fails this check and the earlier published revision stays authoritative (FR-035, T25).
  const swap = await svc.entities.Event.updateMany(
    { id: eventId, currentPublishedRevisionId: currentPublishedRevisionId },
    { $set: { currentPublishedRevisionId: revision.id, versionCounter: nextNumber } },
  );

  if (swap.updated !== 1) {
    return apiError("STALE_REVISION", "Another publish already succeeded first. Review the latest version and try again.", {
      latestRevisionId: (await svc.entities.Event.get(eventId)).currentPublishedRevisionId,
    });
  }

  const batch = await svc.entities.NotificationBatch.create({
    eventId,
    revisionId: revision.id,
    status: "queued",
    idempotencyKey: `${revision.id}:dispatch`,
  });

  await svc.entities.EventAudit.create({
    eventId,
    actorUserId: user.id,
    action: "revision_published",
    targetId: revision.id,
    timestamp: new Date().toISOString(),
    summary: `Published v${nextNumber}`,
    metadataJson: JSON.stringify({ affectedCueIds: result.affectedCueIds, affectedParticipantIds }),
  });

  return apiOk({ revision, notificationBatchId: batch.id }, 201);
}
