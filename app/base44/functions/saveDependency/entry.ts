import { createClientFromRequest } from "npm:@base44/sdk";
import { apiError, apiOk } from "../../shared/apiError.ts";
import { requireOwnedEvent } from "../../shared/requireOwnedEvent.ts";
import { validateGraph } from "../../shared/schedulingEngine/graph.ts";
import { ScheduleValidationError, type Cue, type CueDependency } from "../../shared/schedulingEngine/types.ts";

interface SaveDependencyBody {
  eventId?: string;
  dependencyId?: string; // present => update, absent => create
  predecessorCueId?: string;
  successorCueId?: string;
  type?: "FINISH_TO_START" | "START_TO_START";
  offsetMinutes?: number;
}

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return apiError("NOT_AUTHENTICATED", "Sign in to edit dependencies.");

  const body = (await req.json().catch(() => ({}))) as SaveDependencyBody;
  const owned = await requireOwnedEvent(base44, user.id, body.eventId ?? "");
  if ("error" in owned) return owned.error;
  const event = owned.event as { currentPublishedRevisionId?: string | null };

  if (!body.predecessorCueId || !body.successorCueId) {
    return apiError("VALIDATION_ERROR", "predecessorCueId and successorCueId are required.");
  }
  if (body.type !== "FINISH_TO_START" && body.type !== "START_TO_START") {
    return apiError("VALIDATION_ERROR", "type must be FINISH_TO_START or START_TO_START.");
  }
  if (!Number.isInteger(body.offsetMinutes) || body.offsetMinutes! < 0) {
    return apiError("VALIDATION_ERROR", "offsetMinutes must be a non-negative integer.");
  }

  const svc = base44.asServiceRole;
  const eventId = body.eventId!;

  const [cues, existingDeps] = await Promise.all([
    svc.entities.Cue.filter({ eventId }) as Promise<Cue[]>,
    svc.entities.CueDependency.filter({ eventId }) as Promise<CueDependency[]>,
  ]);
  const cueIds = new Set(cues.map((c) => c.id));
  if (!cueIds.has(body.predecessorCueId) || !cueIds.has(body.successorCueId)) {
    return apiError("VALIDATION_ERROR", "Both cues must belong to this event.");
  }

  const candidate: CueDependency = {
    id: body.dependencyId ?? "candidate",
    predecessorCueId: body.predecessorCueId,
    successorCueId: body.successorCueId,
    type: body.type,
    offsetMinutes: body.offsetMinutes!,
  };
  const edgesWithoutExisting = existingDeps.filter((d) => d.id !== body.dependencyId);

  try {
    validateGraph(cues, [...edgesWithoutExisting, candidate]);
  } catch (err) {
    if (err instanceof ScheduleValidationError) {
      return apiError(err.code === "DEPENDENCY_CYCLE" ? "DEPENDENCY_CYCLE" : "VALIDATION_ERROR", err.message, err.details);
    }
    throw err;
  }

  if (body.dependencyId) {
    const existing = await svc.entities.CueDependency.get(body.dependencyId).catch(() => null);
    if (!existing || existing.eventId !== eventId) return apiError("NOT_FOUND", "Dependency not found on this event.");
    if (event.currentPublishedRevisionId) {
      const revision = await svc.entities.Revision.get(event.currentPublishedRevisionId);
      const snapshot = JSON.parse(revision.fullSnapshotJson as string) as { dependencies: Array<{ id: string }> };
      if (snapshot.dependencies.some((d) => d.id === body.dependencyId)) {
        return apiError("VALIDATION_ERROR", "This dependency is part of the published schedule and can't be edited directly.");
      }
    }
    const dependency = await svc.entities.CueDependency.update(body.dependencyId, {
      eventId,
      predecessorCueId: body.predecessorCueId,
      successorCueId: body.successorCueId,
      type: body.type,
      offsetMinutes: body.offsetMinutes,
    });
    return apiOk({ dependency });
  }

  const dependency = await svc.entities.CueDependency.create({
    eventId,
    predecessorCueId: body.predecessorCueId,
    successorCueId: body.successorCueId,
    type: body.type,
    offsetMinutes: body.offsetMinutes,
  });
  return apiOk({ dependency }, 201);
}
