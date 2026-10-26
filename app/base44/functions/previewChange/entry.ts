import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import { requireOwnedEvent } from "../../shared/requireOwnedEvent.ts";
import { previewChange as runPreview } from "../../shared/schedulingEngine/engine.ts";
import { ScheduleValidationError, type CueEdit, type PublishedSnapshot } from "../../shared/schedulingEngine/types.ts";
import { loadPublishedSnapshot } from "../../shared/loadPublishedSnapshot.ts";
import { canonicalProposalHash } from "../../shared/canonicalProposalHash.ts";
import { affectedVendorParticipantIds } from "../../shared/affectedVendorParticipantIds.ts";

interface PreviewChangeBody {
  eventId?: string;
  baseRevisionId?: string | null;
  edits?: CueEdit[];
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to preview a change.");

  const body = (await req.json().catch(() => ({}))) as PreviewChangeBody;
  const owned = await requireOwnedEvent(base44, user.id, body.eventId ?? "");
  if ("error" in owned) return owned.error;
  const event = owned.event as { id: string; currentPublishedRevisionId?: string | null; hardStopMinute: number };

  if (!Array.isArray(body.edits) || body.edits.length === 0) {
    return apiError("VALIDATION_ERROR", "At least one cue edit is required.");
  }

  const currentPublishedRevisionId = event.currentPublishedRevisionId ?? null;
  if (body.baseRevisionId !== undefined && body.baseRevisionId !== currentPublishedRevisionId) {
    return apiError("STALE_REVISION", "The published schedule changed. Review the latest version and preview again.", {
      latestRevisionId: currentPublishedRevisionId,
    });
  }

  let snapshot: PublishedSnapshot;
  try {
    snapshot = await loadPublishedSnapshot(base44, event.id, currentPublishedRevisionId);
  } catch (err) {
    if (err instanceof ScheduleValidationError) return apiError("VALIDATION_ERROR", err.message, err.details);
    throw err;
  }

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

  const affectedParticipantIds = await affectedVendorParticipantIds(base44, event.id, result.affectedCueIds);

  return apiOk({
    baseRevisionId: currentPublishedRevisionId,
    canPublish: result.canPublish,
    editedCueIds: result.editedCueIds,
    affectedCueIds: result.affectedCueIds,
    affectedParticipantIds,
    explanations: result.explanations,
    conflicts: result.conflicts,
    proposedSnapshot: { cues: result.proposedCues, dependencies: snapshot.dependencies },
    proposalHash: canonicalProposalHash(currentPublishedRevisionId, body.edits),
  });
}
