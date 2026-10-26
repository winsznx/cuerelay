import type { Cue, CueDependency } from "./types.js";
import { ScheduleValidationError } from "./types.js";

/**
 * Validates the dependency graph: unique cue IDs, no self-deps, no missing
 * nodes, no duplicate edge IDs, and no cycles. Throws ScheduleValidationError
 * on the first violation found.
 */
export function validateGraph(cues: Cue[], dependencies: CueDependency[]): void {
  const cueIds = new Set<string>();
  for (const cue of cues) {
    if (cueIds.has(cue.id)) {
      throw new ScheduleValidationError("VALIDATION_ERROR", `Duplicate cue id: ${cue.id}`);
    }
    cueIds.add(cue.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of dependencies) {
    if (edgeIds.has(edge.id)) {
      throw new ScheduleValidationError("VALIDATION_ERROR", `Duplicate dependency id: ${edge.id}`);
    }
    edgeIds.add(edge.id);

    if (!cueIds.has(edge.predecessorCueId) || !cueIds.has(edge.successorCueId)) {
      throw new ScheduleValidationError(
        "VALIDATION_ERROR",
        `Dependency ${edge.id} references a cue outside this event`,
      );
    }
    if (edge.predecessorCueId === edge.successorCueId) {
      throw new ScheduleValidationError(
        "DEPENDENCY_CYCLE",
        `Cue ${edge.predecessorCueId} cannot depend on itself`,
      );
    }
    if (edge.offsetMinutes < 0) {
      throw new ScheduleValidationError(
        "VALIDATION_ERROR",
        `Dependency ${edge.id} has a negative offset, which is not supported`,
      );
    }
  }

  assertAcyclic(cues, dependencies);
}

/** Kahn's algorithm. Throws DEPENDENCY_CYCLE with the offending cue ids if a cycle exists. */
function assertAcyclic(cues: Cue[], dependencies: CueDependency[]): void {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const cue of cues) {
    inDegree.set(cue.id, 0);
    adjacency.set(cue.id, []);
  }
  for (const edge of dependencies) {
    adjacency.get(edge.predecessorCueId)!.push(edge.successorCueId);
    inDegree.set(edge.successorCueId, (inDegree.get(edge.successorCueId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) if (degree === 0) queue.push(id);

  const visited = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  if (visited.size !== cues.length) {
    const cyclic = cues.map((c) => c.id).filter((id) => !visited.has(id));
    throw new ScheduleValidationError(
      "DEPENDENCY_CYCLE",
      `Dependency cycle detected among cues: ${cyclic.join(", ")}`,
      { cueIds: cyclic },
    );
  }
}

/** Returns cue ids in topological order (predecessors before successors). Graph must already be acyclic. */
export function topologicalSort(cues: Cue[], dependencies: CueDependency[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const cue of cues) {
    inDegree.set(cue.id, 0);
    adjacency.set(cue.id, []);
  }
  for (const edge of dependencies) {
    adjacency.get(edge.predecessorCueId)!.push(edge.successorCueId);
    inDegree.set(edge.successorCueId, (inDegree.get(edge.successorCueId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) if (degree === 0) queue.push(id);
  queue.sort();

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    const next = (adjacency.get(id) ?? []).slice().sort();
    for (const n of next) {
      const remaining = (inDegree.get(n) ?? 0) - 1;
      inDegree.set(n, remaining);
      if (remaining === 0) queue.push(n);
    }
  }
  return order;
}
