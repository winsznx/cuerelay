import { topologicalSort, validateGraph } from "./graph.ts";
import {
  EVENT_SPAN_MAX,
  EVENT_SPAN_MIN,
  ScheduleValidationError,
  type Conflict,
  type Cue,
  type CueDependency,
  type CueEdit,
  type CueExplanation,
  type CuePatch,
  type PreviewResult,
  type PublishedSnapshot,
} from "./types.ts";

function requiredBoundary(edge: CueDependency, predecessor: Cue): number {
  return edge.type === "FINISH_TO_START"
    ? predecessor.startMinute + predecessor.durationMinutes + edge.offsetMinutes
    : predecessor.startMinute + edge.offsetMinutes;
}

function validatePatch(cueId: string, patch: CuePatch): void {
  if (patch.startMinute !== undefined) {
    if (!Number.isInteger(patch.startMinute)) {
      throw new ScheduleValidationError("VALIDATION_ERROR", `Cue ${cueId}: startMinute must be an integer`);
    }
    if (patch.startMinute < EVENT_SPAN_MIN || patch.startMinute > EVENT_SPAN_MAX) {
      throw new ScheduleValidationError(
        "VALIDATION_ERROR",
        `Cue ${cueId}: startMinute must be within the event span ${EVENT_SPAN_MIN}-${EVENT_SPAN_MAX}`,
      );
    }
  }
  if (patch.durationMinutes !== undefined) {
    if (!Number.isInteger(patch.durationMinutes) || patch.durationMinutes <= 0) {
      throw new ScheduleValidationError("VALIDATION_ERROR", `Cue ${cueId}: durationMinutes must be a positive integer`);
    }
  }
}

function validateCues(cues: Cue[]): void {
  for (const cue of cues) {
    if (!cue.title.trim()) {
      throw new ScheduleValidationError("VALIDATION_ERROR", `Cue ${cue.id} is missing a title`);
    }
    if (!Number.isInteger(cue.startMinute)) {
      throw new ScheduleValidationError("VALIDATION_ERROR", `Cue ${cue.id} has a non-integer startMinute`);
    }
    if (!Number.isInteger(cue.durationMinutes) || cue.durationMinutes <= 0) {
      throw new ScheduleValidationError("VALIDATION_ERROR", `Cue ${cue.id} has a non-positive durationMinutes`);
    }
  }
}

/**
 * Deterministic preview per PRD §6.4. Always computed against `publishedSnapshot`
 * (the currently published revision) — never against an intermediate, unpublished
 * draft — so that "a flexible cue never auto-moves earlier than its published
 * start" means earlier than the real last-published time, regardless of how many
 * edits are batched into one proposal. Never mutates `publishedSnapshot`.
 *
 * A cue is "pinned" to an edit's explicit `startMinute` and skips automatic
 * boundary propagation for its own start. A cue edited only on `durationMinutes`
 * still propagates its start normally, since only the directly chosen time is a
 * manual override — the PRD distinguishes "manual change" from "autonomous
 * optimisation," not "any edited field."
 */
export function previewChange(publishedSnapshot: PublishedSnapshot, edits: CueEdit[]): PreviewResult {
  if (edits.length === 0) {
    throw new ScheduleValidationError("VALIDATION_ERROR", "previewChange requires at least one edit");
  }
  validateCues(publishedSnapshot.cues);

  const cues = publishedSnapshot.cues.map((c) => ({ ...c }));
  const dependencies = publishedSnapshot.dependencies.map((d) => ({ ...d }));
  validateGraph(cues, dependencies);

  const byId = new Map(cues.map((c) => [c.id, c]));
  const publishedStartById = new Map(publishedSnapshot.cues.map((c) => [c.id, c.startMinute]));
  const editsByCueId = new Map(edits.map((e) => [e.cueId, e.patch]));

  for (const edit of edits) {
    if (!byId.has(edit.cueId)) {
      throw new ScheduleValidationError("NOT_FOUND", `Cue ${edit.cueId} does not belong to this event`);
    }
    validatePatch(edit.cueId, edit.patch);
  }

  // Apply duration overrides up front so every boundary computation below sees final durations.
  for (const [cueId, patch] of editsByCueId) {
    if (patch.durationMinutes !== undefined) byId.get(cueId)!.durationMinutes = patch.durationMinutes;
  }

  const incomingEdges = new Map<string, CueDependency[]>();
  for (const edge of dependencies) {
    const list = incomingEdges.get(edge.successorCueId) ?? [];
    list.push(edge);
    incomingEdges.set(edge.successorCueId, list);
  }

  const order = topologicalSort(cues, dependencies);
  const conflicts: Conflict[] = [];
  const explanations: CueExplanation[] = [];

  for (const cueId of order) {
    const cue = byId.get(cueId)!;
    const publishedStart = publishedStartById.get(cueId)!;
    const patch = editsByCueId.get(cueId);
    const isPinned = patch?.startMinute !== undefined;

    if (isPinned) {
      cue.startMinute = patch!.startMinute!;
      explanations.push({
        cueId: cue.id,
        previousStartMinute: publishedStart,
        proposedStartMinute: cue.startMinute,
        deltaMinutes: cue.startMinute - publishedStart,
        kind: "MANUAL_CHANGE",
        message: "Manual change",
      });
      continue;
    }

    const incoming = incomingEdges.get(cueId) ?? [];
    if (incoming.length === 0) {
      cue.startMinute = publishedStart;
      // Not dependent on anything, so its start never shifts — but a duration-only edit
      // still changed this cue's published content and must still reach assigned vendors.
      if (patch) {
        explanations.push({
          cueId: cue.id,
          previousStartMinute: publishedStart,
          proposedStartMinute: publishedStart,
          deltaMinutes: 0,
          kind: "MANUAL_CHANGE",
          message: "Manual change",
        });
      }
      continue;
    }

    let required = -Infinity;
    let bindingEdge: CueDependency | undefined;
    for (const edge of incoming) {
      const predecessor = byId.get(edge.predecessorCueId)!;
      const boundary = requiredBoundary(edge, predecessor);
      if (boundary > required) {
        required = boundary;
        bindingEdge = edge;
      }
    }

    const proposedStart = Math.max(publishedStart, required);

    if (cue.mode === "FIXED") {
      if (proposedStart !== publishedStart) {
        const predecessor = byId.get(bindingEdge!.predecessorCueId)!;
        conflicts.push({
          code: "FIXED_CUE_BLOCKED",
          cueId: cue.id,
          message: `${cue.title} is fixed and cannot move, but ${predecessor.title} now requires it to start at or after minute ${required}.`,
          details: { requiredStartMinute: required, fixedStartMinute: publishedStart },
        });
      }
      cue.startMinute = publishedStart;
      continue;
    }

    cue.startMinute = proposedStart;
    if (proposedStart !== publishedStart) {
      const predecessor = byId.get(bindingEdge!.predecessorCueId)!;
      const verb = bindingEdge!.type === "FINISH_TO_START" ? "ends" : "starts";
      const anchor =
        bindingEdge!.type === "FINISH_TO_START"
          ? predecessor.startMinute + predecessor.durationMinutes
          : predecessor.startMinute;
      explanations.push({
        cueId: cue.id,
        previousStartMinute: publishedStart,
        proposedStartMinute: proposedStart,
        deltaMinutes: proposedStart - publishedStart,
        kind: "CAUSAL_SHIFT",
        bindingPredecessorCueId: predecessor.id,
        bindingDependencyId: bindingEdge!.id,
        message: `Moved because ${predecessor.title} now ${verb} at minute ${anchor} and a ${bindingEdge!.offsetMinutes}-minute buffer is required.`,
      });
    } else if (patch) {
      // Start didn't move, but a duration-only edit still changed this cue's published content.
      explanations.push({
        cueId: cue.id,
        previousStartMinute: publishedStart,
        proposedStartMinute: publishedStart,
        deltaMinutes: 0,
        kind: "MANUAL_CHANGE",
        message: "Manual change",
      });
    }
  }

  for (const edge of dependencies) {
    const predecessor = byId.get(edge.predecessorCueId)!;
    const successor = byId.get(edge.successorCueId)!;
    const boundary = requiredBoundary(edge, predecessor);
    if (successor.startMinute < boundary) {
      conflicts.push({
        code: "DEPENDENCY_VIOLATION",
        cueId: successor.id,
        message: `${successor.title} starts at minute ${successor.startMinute} but must start at or after minute ${boundary} per its dependency on ${predecessor.title}.`,
        details: { dependencyId: edge.id, requiredStartMinute: boundary },
      });
    }
  }

  for (const cue of cues) {
    const allowedEnd = cue.latestEndMinute ?? publishedSnapshot.hardStopMinute;
    const proposedEnd = cue.startMinute + cue.durationMinutes;
    if (proposedEnd > allowedEnd) {
      conflicts.push({
        code: "TIME_WINDOW_VIOLATION",
        cueId: cue.id,
        message: `${cue.title} would end at minute ${proposedEnd}, after its allowed end of minute ${allowedEnd}.`,
        details: { proposedEndMinute: proposedEnd, allowedEndMinute: allowedEnd },
      });
    }
  }

  const byResource = new Map<string, Cue[]>();
  for (const cue of cues) {
    if (!cue.exclusiveResourceId) continue;
    const list = byResource.get(cue.exclusiveResourceId) ?? [];
    list.push(cue);
    byResource.set(cue.exclusiveResourceId, list);
  }
  for (const [resourceId, resourceCues] of byResource) {
    const sorted = resourceCues.slice().sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      if (a.startMinute + a.durationMinutes > b.startMinute) {
        conflicts.push({
          code: "RESOURCE_OVERLAP",
          cueId: b.id,
          message: `${b.title} overlaps with ${a.title} on shared resource ${resourceId}.`,
          details: { resourceId, otherCueId: a.id },
        });
      }
    }
  }

  const affectedCueIds = explanations.map((e) => e.cueId);

  return {
    canPublish: conflicts.length === 0,
    editedCueIds: edits.map((e) => e.cueId),
    proposedCues: cues,
    affectedCueIds,
    explanations,
    conflicts,
  };
}
